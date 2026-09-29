import { act, cleanup, renderHook } from '@testing-library/react'
import { atom, createStore } from 'jotai'
import { afterEach, describe, expect, it } from 'vitest'

import { createStoreWrapper } from '../../../../../tests/jotai'
import { createHistoryAtom, useHistoryControls, useHistoryEdit, useHistoryValue } from '../history'

afterEach(cleanup)

describe('createHistoryAtom', () => {
  it('reflects the current state, restores selected history, and resets its stack', () => {
    const stateAtom = atom({ value: 0 })
    const historyAtom = createHistoryAtom(stateAtom, 5)
    const store = createStore()
    const history = store.get(historyAtom)

    expect(history.stack).toHaveLength(1)
    expect(history.stack[0]).toMatchObject({ action: 'init', state: { value: 0 } })

    store.set(historyAtom, {
      ...history,
      stack: [...history.stack, { action: 'increment', desc: 'Increment', state: { value: 1 }, time: Date.now() }],
      index: 1,
    })

    expect(store.get(stateAtom)).toEqual({ value: 1 })
    expect(store.get(historyAtom).index).toBe(1)

    store.set(historyAtom, 'RESET')

    expect(store.get(historyAtom).stack).toHaveLength(1)
    expect(store.get(historyAtom).stack[0].state).toEqual({ value: 1 })
    expect(store.get(historyAtom).limit).toBe(5)
  })
})

describe('useHistoryControls', () => {
  it('undoes, redoes, and checks out entries while ignoring out-of-range requests', () => {
    const stateAtom = atom({ value: 0 })
    const historyAtom = createHistoryAtom(stateAtom, 5)
    const store = createStore()

    for (const value of [1, 2]) {
      store.set(historyAtom, (previous) => ({
        ...previous,
        stack: [...previous.stack, { action: 'edit', desc: 'Edit', state: { value }, time: Date.now() }],
        index: previous.stack.length,
      }))
    }

    const { result } = renderHook(() => useHistoryControls(historyAtom), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.undo())
    expect(store.get(stateAtom)).toEqual({ value: 1 })

    act(() => result.current.undo())
    expect(store.get(stateAtom)).toEqual({ value: 0 })

    act(() => result.current.undo())
    expect(store.get(historyAtom).index).toBe(0)

    act(() => result.current.redo())
    expect(store.get(stateAtom)).toEqual({ value: 1 })

    act(() => result.current.checkout(2))
    expect(store.get(stateAtom)).toEqual({ value: 2 })

    act(() => result.current.redo())
    expect(store.get(historyAtom).index).toBe(2)

    act(() => result.current.checkout(-1))
    act(() => result.current.checkout(3))
    expect(store.get(historyAtom).index).toBe(2)

    act(() => result.current.checkout(0))
    expect(store.get(stateAtom)).toEqual({ value: 0 })
  })
})

describe('useHistoryValue', () => {
  it('exposes the selected state and undo/redo availability', () => {
    const stateAtom = atom({ value: 0 })
    const historyAtom = createHistoryAtom(stateAtom, 5)
    const store = createStore()
    const { result } = renderHook(() => useHistoryValue(historyAtom), {
      wrapper: createStoreWrapper(store),
    })

    expect(result.current).toMatchObject({ state: { value: 0 }, canUndo: false, canRedo: false })

    act(() =>
      store.set(historyAtom, (previous) => ({
        ...previous,
        stack: [...previous.stack, { action: 'edit', desc: 'Edit', state: { value: 1 }, time: Date.now() }],
        index: 1,
      })),
    )

    expect(result.current).toMatchObject({ state: { value: 1 }, canUndo: true, canRedo: false })

    act(() => store.set(historyAtom, (previous) => ({ ...previous, index: 0 })))

    expect(result.current).toMatchObject({ state: { value: 0 }, canUndo: false, canRedo: true })
  })
})

describe('useHistoryEdit', () => {
  it('records edits and squashes consecutive matching checkpoints', () => {
    const stateAtom = atom({ value: 0 })
    const historyAtom = createHistoryAtom(stateAtom, 5)
    const store = createStore()
    const { result } = renderHook(() => useHistoryEdit(historyAtom), {
      wrapper: createStoreWrapper(store),
    })

    for (const value of [1, 2]) {
      act(() =>
        result.current((_, set) => {
          set(stateAtom, { value })
          return { action: 'set-value', desc: 'Set value', squashBy: 'value' }
        }),
      )
    }

    const history = store.get(historyAtom)
    expect(store.get(stateAtom)).toEqual({ value: 2 })
    expect(history.stack).toHaveLength(2)
    expect(history.stack[0].state).toEqual({ value: 0 })
    expect(history.stack[1]).toMatchObject({
      action: 'set-value',
      squashBy: 'value',
      state: { value: 2 },
    })
  })

  it('applies skipped edits without adding a history entry', () => {
    const stateAtom = atom({ value: 0 })
    const historyAtom = createHistoryAtom(stateAtom, 5)
    const store = createStore()
    const { result } = renderHook(() => useHistoryEdit(historyAtom), {
      wrapper: createStoreWrapper(store),
    })

    act(() =>
      result.current((_, set, skip) => {
        set(stateAtom, { value: 1 })
        return skip
      }),
    )

    expect(store.get(stateAtom)).toEqual({ value: 1 })
    expect(store.get(historyAtom).stack).toHaveLength(1)
  })
})
