import { act, cleanup, renderHook } from '@testing-library/react'
import { createStore } from 'jotai'
import { getDefaultStore } from 'jotai'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createStoreWrapper } from '../../../../../tests/jotai'
import { languageChangeEmitter, translationsAtom } from '../../../../i18n/i18n'
import { editorAtoms } from '../editor-state'
import {
  editorValidationAtom,
  useEditorValidation,
  useEntityErrors,
  useEntityWarnings,
  type EntityIssue,
} from '../validation'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('editorValidationAtom', () => {
  it('separates global warnings from issues attached to an entity', () => {
    const store = createStore()
    const operation = store.get(editorAtoms.operation)

    store.set(editorAtoms.operation, {
      ...operation,
      stageName: '',
      doc: { title: 'Example' },
      opers: [{ id: 'invalid-operator', name: '' }],
    })
    store.set(editorValidationAtom)

    expect(store.get(editorAtoms.globalWarnings)).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['stage_name'] })]),
    )
    expect(store.get(editorAtoms.entityErrors)['invalid-operator']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'invalid-operator',
          path: ['opers', 0, 'name'],
        }),
      ]),
    )
  })
})

describe('entity issue hooks', () => {
  it('exposes issues only while validation details are visible', () => {
    const store = createStore()
    const issue = {
      code: 'custom',
      input: 'invalid',
      path: ['opers', 0, 'name'],
      message: 'Invalid operator',
      entityId: 'operator-1',
    } as EntityIssue
    store.set(editorAtoms.errorsVisible, true)
    store.set(editorAtoms.entityErrors, { 'operator-1': [issue] })
    store.set(editorAtoms.entityWarnings, { 'operator-1': [issue] })

    const wrapper = createStoreWrapper(store)
    const errors = renderHook(() => useEntityErrors('operator-1'), { wrapper })
    const warnings = renderHook(() => useEntityWarnings('operator-1'), { wrapper })

    expect(errors.result.current).toEqual([issue])
    expect(warnings.result.current).toEqual([issue])

    act(() => store.set(editorAtoms.errorsVisible, false))

    expect(errors.result.current).toBeUndefined()
    expect(warnings.result.current).toBeUndefined()
  })
})

describe('useEditorValidation', () => {
  it('debounces operation validation and responds to locale events until unmount', () => {
    vi.useFakeTimers()
    const store = createStore()
    store.set(translationsAtom, getDefaultStore().get(translationsAtom))
    store.set(editorAtoms.operation, (operation) => ({
      ...operation,
      stageName: '',
      doc: { title: 'Valid title' },
    }))

    const { unmount } = renderHook(() => useEditorValidation(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => vi.advanceTimersByTime(500))
    expect(store.get(editorAtoms.globalWarnings)).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['stage_name'] })]),
    )

    act(() => store.set(editorAtoms.globalWarnings, []))
    act(() => languageChangeEmitter.emit('localeLoadedForZod'))
    act(() => vi.advanceTimersByTime(500))
    expect(store.get(editorAtoms.globalWarnings)).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['stage_name'] })]),
    )

    act(() => unmount())
    act(() => store.set(editorAtoms.globalWarnings, []))
    act(() => languageChangeEmitter.emit('localeLoadedForZod'))
    act(() => vi.advanceTimersByTime(500))
    expect(store.get(editorAtoms.globalWarnings)).toEqual([])
  })
})
