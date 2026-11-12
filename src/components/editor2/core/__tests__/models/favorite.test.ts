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

  it('removes only the matching favorite variant or group while preserving other favorites', () => {
    const store = createStore()
    store.set(favOperatorAtom, [])
    store.set(favGroupAtom, [])

    const operatorVariantA: EditorOperator = { id: 'op-a', name: 'Amiya', role: 'caster', skill: 3 }
    const operatorVariantB: EditorOperator = { id: 'op-b', name: 'Amiya', role: 'guard', skill: 2 }
    const anotherOperator: EditorOperator = { id: 'op-c', name: 'Bagpipe', skill: 3 }

    const groupA: EditorGroup = {
      id: 'group-a',
      name: 'Vanguards',
      opers: [{ id: 'g-op-1', name: 'Bagpipe' }],
    }
    const groupSameNameDifferentOpers: EditorGroup = {
      id: 'group-b',
      name: 'Vanguards',
      opers: [{ id: 'g-op-2', name: 'Myrtle' }],
    }
    const blankNameGroup: EditorGroup = {
      id: 'group-c',
      name: '',
      opers: [{ id: 'g-op-3', name: 'Ines' }],
    }

    const operatorControls = renderHook(() => useFavoriteOperatorControls(), {
      wrapper: createStoreWrapper(store),
    })
    const groupControls = renderHook(() => useFavoriteGroupControls(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => {
      operatorControls.result.current.addFavoriteOperator(operatorVariantA)
      operatorControls.result.current.addFavoriteOperator(operatorVariantB)
      operatorControls.result.current.addFavoriteOperator(anotherOperator)
      groupControls.result.current.addFavoriteGroup(groupA)
      groupControls.result.current.addFavoriteGroup(groupSameNameDifferentOpers)
      groupControls.result.current.addFavoriteGroup(blankNameGroup)
    })

    act(() => operatorControls.result.current.removeFavoriteOperator(operatorVariantA))
    act(() => groupControls.result.current.removeFavoriteGroup(groupA))

    expect(store.get(favOperatorAtom)).toEqual([
      { name: 'Amiya', role: 'guard', skill: 2 },
      { name: 'Bagpipe', skill: 3 },
    ])
    expect(store.get(favGroupAtom)).toEqual([
      { name: 'Vanguards', opers: [{ name: 'Myrtle' }] },
      { name: '', opers: [{ name: 'Ines' }] },
    ])

    act(() => groupControls.result.current.removeFavoriteGroup(blankNameGroup))
    expect(store.get(favGroupAtom)).toEqual([{ name: 'Vanguards', opers: [{ name: 'Myrtle' }] }])
  })

  it('reconciles with concurrent localStorage updates before removing favorites', () => {
    const store = createStore()
    store.set(favOperatorAtom, [{ name: 'Operator 1' }])
    store.set(favGroupAtom, [{ name: 'Group 1', opers: [{ name: 'Operator 1' }] }])

    const operatorControls = renderHook(() => useFavoriteOperatorControls(), {
      wrapper: createStoreWrapper(store),
    })
    const groupControls = renderHook(() => useFavoriteGroupControls(), {
      wrapper: createStoreWrapper(store),
    })

    // Simulate another browser tab writing new favorites to localStorage before storage event arrives
    localStorage.setItem('zoot-plus-fav-operator', JSON.stringify([{ name: 'Operator 1' }, { name: 'From other tab' }]))
    localStorage.setItem(
      'zoot-plus-fav-groups',
      JSON.stringify([
        { name: 'Group 1', opers: [{ name: 'Operator 1' }] },
        { name: 'Group from other tab', opers: [{ name: 'From other tab' }] },
      ]),
    )

    act(() => operatorControls.result.current.removeFavoriteOperator({ name: 'Operator 1' }))
    act(() =>
      groupControls.result.current.removeFavoriteGroup({
        name: 'Group 1',
        opers: [{ name: 'Operator 1' }],
      }),
    )

    expect(store.get(favOperatorAtom)).toEqual([{ name: 'From other tab' }])
    expect(store.get(favGroupAtom)).toEqual([{ name: 'Group from other tab', opers: [{ name: 'From other tab' }] }])
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
