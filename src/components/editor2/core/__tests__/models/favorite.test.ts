import { act, cleanup, renderHook } from '@testing-library/react'
import { atom, createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toaster = vi.hoisted(() => ({ show: vi.fn() }))

vi.mock('../../../../Toaster', () => ({
  AppToaster: toaster,
}))

import { createStoreWrapper } from '../../../../../../tests/jotai'
import { favGroupAtom, type FavGroup } from '../../../../../store/useFavGroups'
import { favOperatorAtom } from '../../../../../store/useFavOperators'
import { type EditorGroup, type EditorOperator } from '../../editor-state'
import {
  FavoriteGroupOperatorsConflictError,
  editorFavGroupsAtom,
  editorFavOperatorsAtom,
  useApplyFavoriteGroup,
  useFavoriteGroupControls,
  useFavoriteOperatorControls,
} from '../../models/favorite'

beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('favorite controls', () => {
  it('stores favorite operators and groups without editor entity IDs and shows success toasts', () => {
    const store = createStore()
    store.set(favOperatorAtom, [])
    store.set(favGroupAtom, [])
    const operator: EditorOperator = { id: 'operator-editor-id', name: 'Favorite operator' }
    const group: EditorGroup = {
      id: 'group-editor-id',
      name: 'Favorite group',
      opers: [{ id: 'group-operator-editor-id', name: 'Grouped operator' }],
    }
    const operatorControls = renderHook(() => useFavoriteOperatorControls(), {
      wrapper: createStoreWrapper(store),
    })
    const groupControls = renderHook(() => useFavoriteGroupControls(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => operatorControls.result.current.addFavoriteOperator(operator))
    act(() => groupControls.result.current.addFavoriteGroup(group))

    expect(store.get(favOperatorAtom)).toEqual([{ name: 'Favorite operator' }])
    expect(store.get(favGroupAtom)[0]).toMatchObject({
      name: 'Favorite group',
      opers: [{ name: 'Grouped operator' }],
    })
    expect(store.get(favGroupAtom)[0]).not.toHaveProperty('id')
    expect(toaster.show).toHaveBeenCalledTimes(2)
    expect(toaster.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ intent: 'success' }))
    expect(toaster.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ intent: 'success' }))
  })

  it('round-trips editor favorite operators through generated IDs', () => {
    const store = createStore()
    store.set(favOperatorAtom, [{ name: 'Favorite operator' }])

    const editorOperators = store.get(editorFavOperatorsAtom)
    expect(editorOperators[0].id).toBeTruthy()

    store.set(editorFavOperatorsAtom, editorOperators)

    expect(store.get(favOperatorAtom)).toEqual([{ name: 'Favorite operator' }])
  })

  it('round-trips favorite groups without exposing editor IDs', () => {
    const store = createStore()
    store.set(favGroupAtom, [{ name: 'Favorite group', opers: [{ name: 'Favorite operator' }] }])

    const editorGroups = store.get(editorFavGroupsAtom)
    expect(editorGroups[0].id).toBeTruthy()

    store.set(editorFavGroupsAtom, editorGroups)

    expect(store.get(favGroupAtom)[0]).toMatchObject({
      name: 'Favorite group',
      opers: [{ name: 'Favorite operator' }],
    })
    expect(store.get(favGroupAtom)[0]).not.toHaveProperty('id')
  })
})

describe('useApplyFavoriteGroup', () => {
  const favorite: FavGroup = {
    name: 'Favorite squad',
    opers: [{ name: 'Favorite operator' }],
  }

  it('appends favorite operators and adopts the favorite group name', () => {
    const store = createStore()
    const group: EditorGroup = {
      id: 'group-1',
      name: 'Existing squad',
      opers: [{ id: 'existing-operator', name: 'Existing operator' }],
    }
    const groupAtom = atom(group)
    const { result } = renderHook(() => useApplyFavoriteGroup(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current(groupAtom, favorite, 'append'))

    expect(store.get(groupAtom).name).toBe('Favorite squad')
    expect(store.get(groupAtom).opers.map(({ name }) => name)).toEqual(['Existing operator', 'Favorite operator'])
  })

  it('overwrites an empty target in determine mode and rejects a populated target', () => {
    const store = createStore()
    const emptyGroupAtom = atom<EditorGroup>({ id: 'empty-group', name: '', opers: [] })
    const populatedGroupAtom = atom<EditorGroup>({
      id: 'populated-group',
      name: 'Existing squad',
      opers: [{ id: 'existing-operator', name: 'Existing operator' }],
    })
    const { result } = renderHook(() => useApplyFavoriteGroup(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current(emptyGroupAtom, favorite, 'determine'))
    expect(store.get(emptyGroupAtom).name).toBe('Favorite squad')
    expect(store.get(emptyGroupAtom).opers.map(({ name }) => name)).toEqual(['Favorite operator'])

    expect(() => result.current(populatedGroupAtom, favorite, 'determine')).toThrow(FavoriteGroupOperatorsConflictError)
    expect(store.get(populatedGroupAtom).opers).toHaveLength(1)
  })

  it('does nothing when the favorite has no operators', () => {
    const store = createStore()
    const group: EditorGroup = { id: 'group-1', name: 'Existing squad', opers: [] }
    const groupAtom = atom(group)
    const { result } = renderHook(() => useApplyFavoriteGroup(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current(groupAtom, { name: 'Empty favorite', opers: [] }, 'overwrite'))

    expect(store.get(groupAtom)).toEqual(group)
  })
})
