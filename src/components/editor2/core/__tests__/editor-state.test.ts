import { act, cleanup, renderHook } from '@testing-library/react'
import { atom, createStore } from 'jotai'
import { afterEach, describe, expect, it } from 'vitest'

import { createStoreWrapper } from '../../../../../tests/jotai'
import { defaultEditorState, editorAtoms, useActiveState, type EditorGroup } from '../editor-state'

afterEach(cleanup)

describe('editor atoms', () => {
  it('resets editor state and clears validation issues', () => {
    const store = createStore()
    const state = store.get(editorAtoms.editor)

    expect(state).toEqual(defaultEditorState)

    store.set(editorAtoms.editor, {
      ...state,
      operation: {
        ...state.operation,
        opers: [{ id: 'temporary-operator', name: 'Operator' }],
      },
    })
    store.set(editorAtoms.globalErrors, [{ message: 'stale issue' }])
    store.set(editorAtoms.reset)

    expect(store.get(editorAtoms.editor)).toEqual(defaultEditorState)
    expect(store.get(editorAtoms.globalErrors)).toEqual([])
  })

  it('projects groups through split atoms while preserving their operators', () => {
    const store = createStore()
    const group: EditorGroup = {
      id: 'group-1',
      name: 'Squad',
      opers: [{ id: 'operator-1', name: 'Operator' }],
    }

    store.set(editorAtoms.groups, [group])

    const groupAtom = store.get(editorAtoms.groupAtoms)[0]
    expect(store.get(groupAtom)).toEqual(group)

    store.set(groupAtom, (current) => ({ ...current, name: 'Updated squad' }))

    expect(store.get(editorAtoms.groups)).toMatchObject([{ ...group, name: 'Updated squad' }])
    expect(store.get(editorAtoms.groups)[0].opers).toEqual(group.opers)
  })

  it('tracks and updates whether an entity is active', () => {
    const store = createStore()
    const activeIdAtom = atom<string | undefined>(undefined)
    const { result, rerender } = renderHook(() => useActiveState(activeIdAtom, 'group-1'), {
      wrapper: createStoreWrapper(store),
    })

    expect(result.current[0]).toBe(false)

    act(() => result.current[1](true))
    rerender()
    expect(result.current[0]).toBe(true)
    expect(store.get(activeIdAtom)).toBe('group-1')

    act(() => result.current[1](false))
    rerender()
    expect(result.current[0]).toBe(false)
    expect(store.get(activeIdAtom)).toBeUndefined()
  })
})
