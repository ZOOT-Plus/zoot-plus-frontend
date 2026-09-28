import { act, cleanup, renderHook } from '@testing-library/react'
import { createStore } from 'jotai'
import { afterEach, describe, expect, it } from 'vitest'

import { createStoreWrapper } from '../../../../../tests/jotai'
import { editorAtoms, historyAtom } from '../editor-state'
import { useEditorHistoryKeyboard } from '../hotkey'

afterEach(cleanup)

function addHistoryEntry(store: ReturnType<typeof createStore>) {
  const previousState = store.get(editorAtoms.editor)
  const nextState = {
    ...previousState,
    metadata: { ...previousState.metadata, videoUrl: 'next-state' },
  }
  store.set(historyAtom, (previous) => ({
    ...previous,
    stack: [...previous.stack, { action: 'edit', desc: 'Edit', state: nextState, time: Date.now() }],
    index: previous.stack.length,
  }))
  return { previousState, nextState }
}

describe('useEditorHistoryKeyboard', () => {
  it('handles undo and redo keyboard shortcuts and prevents native history input', () => {
    const store = createStore()
    const { previousState, nextState } = addHistoryEntry(store)
    renderHook(() => useEditorHistoryKeyboard(), {
      wrapper: createStoreWrapper(store),
    })

    const undoEvent = new KeyboardEvent('keydown', {
      code: 'KeyZ',
      ctrlKey: true,
      cancelable: true,
    })
    act(() => document.dispatchEvent(undoEvent))

    expect(undoEvent.defaultPrevented).toBe(true)
    expect(store.get(editorAtoms.editor)).toEqual(previousState)

    const redoEvent = new KeyboardEvent('keydown', {
      code: 'KeyZ',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    })
    act(() => document.dispatchEvent(redoEvent))

    expect(redoEvent.defaultPrevented).toBe(true)
    expect(store.get(editorAtoms.editor)).toEqual(nextState)

    const beforeInput = new Event('beforeinput', { cancelable: true })
    Object.defineProperty(beforeInput, 'inputType', { value: 'historyUndo' })
    act(() => document.dispatchEvent(beforeInput))
    expect(beforeInput.defaultPrevented).toBe(true)
  })

  it('leaves native undo available while the source editor is open and removes listeners on unmount', () => {
    const store = createStore()
    const { nextState } = addHistoryEntry(store)
    store.set(editorAtoms.sourceEditorIsOpen, true)
    const { unmount } = renderHook(() => useEditorHistoryKeyboard(), {
      wrapper: createStoreWrapper(store),
    })

    const keyEvent = new KeyboardEvent('keydown', {
      code: 'KeyZ',
      ctrlKey: true,
      cancelable: true,
    })
    const beforeInput = new Event('beforeinput', { cancelable: true })
    Object.defineProperty(beforeInput, 'inputType', { value: 'historyUndo' })
    act(() => {
      document.dispatchEvent(keyEvent)
      document.dispatchEvent(beforeInput)
    })

    expect(keyEvent.defaultPrevented).toBe(false)
    expect(beforeInput.defaultPrevented).toBe(false)
    expect(store.get(editorAtoms.editor)).toEqual(nextState)

    act(() => unmount())
    store.set(editorAtoms.sourceEditorIsOpen, false)
    const afterUnmount = new KeyboardEvent('keydown', {
      code: 'KeyZ',
      ctrlKey: true,
      cancelable: true,
    })
    document.dispatchEvent(afterUnmount)

    expect(afterUnmount.defaultPrevented).toBe(false)
    expect(store.get(editorAtoms.editor)).toEqual(nextState)
  })
})
