import { act, cleanup, renderHook } from '@testing-library/react'
import { createStore } from 'jotai'
import type { RefObject } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createStoreWrapper } from '../../../../../tests/jotai'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { editorAtoms, historyAtom } from '../editor-state'
import { operationForParsing, type ParsedOperation } from '../schema'
import { parseSourceText, type SourceEditorSubmitter, useSourceEditorSync } from '../source'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('parseSourceText', () => {
  it('parses valid source without warnings', () => {
    const result = parseSourceText(
      JSON.stringify({
        stage_name: 'stage-1',
        doc: { title: 'Example' },
        actions: [{ type: CopilotDocV1.Type.Click, location: [1, 2] }],
      }),
    )

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.parsed).toMatchObject({
      stage_name: 'stage-1',
      doc: { title: 'Example' },
      actions: [{ type: CopilotDocV1.Type.Click, location: [1, 2] }],
    })
  })

  it('distinguishes JSON syntax errors from operation shape errors', () => {
    const syntaxError = parseSourceText('{"actions":[')
    const shapeError = parseSourceText(JSON.stringify({ actions: [{ type: 'UnknownAction' }] }))

    expect(syntaxError.errors).toHaveLength(1)
    expect(syntaxError.warnings).toEqual([])
    expect(shapeError.errors[0]).toMatch(/^actions\.0\.type:/)
    expect(shapeError.warnings).toEqual([])
  })

  it('returns semantically invalid operations with warnings', () => {
    const result = parseSourceText('{}')

    expect(result.parsed).toBeDefined()
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/^stage_name:/)]))
  })
})

describe('useSourceEditorSync', () => {
  it('debounces a source submission and records a changed operation', () => {
    vi.useFakeTimers()
    const store = createStore()
    const parsed = operationForParsing.parse({
      stage_name: 'stage-1',
      doc: { title: 'Synced operation' },
    })
    const submit = vi.fn((onSubmit: (operation: ParsedOperation) => void) => {
      onSubmit(parsed)
      return true
    })
    const workspaceRef: RefObject<SourceEditorSubmitter | null> = { current: { submit } }
    const { result } = renderHook(() => useSourceEditorSync(workspaceRef, 25), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.requestSync())
    expect(result.current.syncState).toBe('pending')

    act(() => vi.advanceTimersByTime(25))

    expect(submit).toHaveBeenCalledTimes(1)
    expect(result.current.syncState).toBe('idle')
    expect(store.get(editorAtoms.operation).stageName).toBe('stage-1')
    expect(store.get(historyAtom).stack.at(-1)?.action).toBe('edit-json')
  })

  it('reports a rejected submission as failed without changing the operation', () => {
    vi.useFakeTimers()
    const store = createStore()
    const originalOperation = store.get(editorAtoms.operation)
    const submit = vi.fn(() => false)
    const workspaceRef: RefObject<SourceEditorSubmitter | null> = { current: { submit } }
    const { result } = renderHook(() => useSourceEditorSync(workspaceRef, 25), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.requestSync())
    act(() => vi.advanceTimersByTime(25))

    expect(result.current.syncState).toBe('failed')
    expect(store.get(editorAtoms.operation)).toEqual(originalOperation)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('flushes a pending submission when the hook unmounts', () => {
    vi.useFakeTimers()
    const store = createStore()
    const parsed = operationForParsing.parse({
      stage_name: 'stage-on-unmount',
      doc: { title: 'Pending operation' },
    })
    const submit = vi.fn((onSubmit: (operation: ParsedOperation) => void) => {
      onSubmit(parsed)
      return true
    })
    const workspaceRef: RefObject<SourceEditorSubmitter | null> = { current: { submit } }
    const { result, unmount } = renderHook(() => useSourceEditorSync(workspaceRef, 100), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.requestSync())
    act(() => unmount())

    expect(submit).toHaveBeenCalledTimes(1)
    expect(store.get(editorAtoms.operation).stageName).toBe('stage-on-unmount')
  })
})
