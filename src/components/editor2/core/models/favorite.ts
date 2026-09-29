import { atom, PrimitiveAtom, useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { uniqueId } from 'lodash-es'
import { useCallback } from 'react'
import { SetOptional } from 'type-fest'

import { i18n } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { FavGroup, favGroupAtom } from '../../../../store/useFavGroups'
import { FavOperator, favOperatorAtom } from '../../../../store/useFavOperators'
import { AppToaster } from '../../../Toaster'
import { editorAtoms, useEdit } from '../../core/editor-state'
import { createOperator } from '../../core/models/operator'
import { EditorGroup, EditorOperator } from '../editor-state'
import { WithId } from '../reconciliation'

const favOperatorCache = new WeakMap<FavOperator, WithId<FavOperator>>()
const favOperatorReverseCache = new WeakMap<WithId<FavOperator> | EditorOperator, FavOperator>()
export const editorFavOperatorsAtom = atom(
  (get) =>
    get(favOperatorAtom).map((operator) => {
      const cached = favOperatorCache.get(operator)
      if (cached) {
        return cached
      }
      const newOperator = { ...operator, id: uniqueId() }
      favOperatorCache.set(operator, newOperator)
      favOperatorReverseCache.set(newOperator, operator)
      return newOperator
    }),
  (
    get,
    set,
    update:
      | (WithId<FavOperator> | EditorOperator)[]
      | ((prev: WithId<FavOperator>[]) => (WithId<FavOperator> | EditorOperator)[]),
  ) => {
    if (typeof update === 'function') {
      update = update(get(editorFavOperatorsAtom))
    }
    const newOperators = update.map((operator) => {
      const cached = favOperatorReverseCache.get(operator)
      if (cached) {
        return cached
      }
      const { id, ...newOperator } = { ...operator, id: '' }
      favOperatorCache.set(newOperator, operator)
      favOperatorReverseCache.set(operator, newOperator)
      return newOperator
    })

    // 检查有没有多余的属性
    0 as unknown as FavOperator[] satisfies typeof newOperators
    set(favOperatorAtom, newOperators)
  },
)

const favGroupCache = new WeakMap<FavGroup, WithId<FavGroup>>()
const favGroupReverseCache = new WeakMap<WithId<FavGroup> | EditorGroup, FavGroup>()
export const editorFavGroupsAtom = atom(
  (get) =>
    get(favGroupAtom).map((group) => {
      const cached = favGroupCache.get(group)
      if (cached) {
        return cached
      }
      const newGroup = { ...group, id: uniqueId() }
      favGroupCache.set(group, newGroup)
      favGroupReverseCache.set(newGroup, group)
      return newGroup
    }),
  (
    get,
    set,
    update: (WithId<FavGroup> | EditorGroup)[] | ((prev: WithId<FavGroup>[]) => (WithId<FavGroup> | EditorGroup)[]),
  ) => {
    if (typeof update === 'function') {
      update = update(get(editorFavGroupsAtom))
    }
    const newGroups = update.map((group) => {
      const cached = favGroupReverseCache.get(group)
      if (cached) {
        return cached
      }
      const { id, ...newGroup } = {
        ...group,
        id: '',
        opers: group.opers?.map((operator: CopilotDocV1.Operator | EditorOperator) => {
          const { id, ...newOperator } = {
            ...operator,
            id: '',
          }
          return newOperator
        }),
      }
      favGroupCache.set(newGroup, group)
      favGroupReverseCache.set(group, newGroup)
      return newGroup
    })

    // 检查有没有多余的属性
    0 as unknown as FavGroup satisfies SetOptional<(typeof newGroups)[number], 'opers'>
    set(favGroupAtom, newGroups)
  },
)

export function useFavoriteOperatorControls() {
  const setEditorFavOperators = useSetAtom(editorFavOperatorsAtom)
  const addFavoriteOperator = useCallback(
    (operator: EditorOperator) => {
      setEditorFavOperators((prev) => [...prev, operator])
      AppToaster.show({
        message: i18n.components.editor2.OperatorItem.added_to_favorites,
        intent: 'success',
      })
    },
    [setEditorFavOperators],
  )

  return { addFavoriteOperator }
}

export function useFavoriteGroupControls() {
  const setEditorFavGroups = useSetAtom(editorFavGroupsAtom)
  const addFavoriteGroup = useCallback(
    (group: EditorGroup) => {
      setEditorFavGroups((prev) => [...prev, group])
      AppToaster.show({
        message: i18n.components.editor2.GroupItem.added_to_favorites,
        intent: 'success',
      })
    },
    [setEditorFavGroups],
  )

  return { addFavoriteGroup }
}

export function useApplyFavoriteGroup() {
  const edit = useEdit()
  const applyFavoriteGroup = useAtomCallback(
    useCallback(
      (
        get,
        set,
        groupAtom: PrimitiveAtom<EditorGroup>,
        favGroup: FavGroup,
        mode: 'determine' | 'append' | 'overwrite',
      ) => {
        if (!favGroup.opers?.length) {
          return
        }
        const group = get(groupAtom)
        if (mode === 'determine') {
          if (group.opers.length > 0) {
            throw new FavoriteGroupOperatorsConflictError()
          }
          mode = 'overwrite'
        }
        const globalOperators = get(editorAtoms.operators)
        const favOperators = favGroup
          .opers!.map((o) => createOperator(o))
          // 过滤掉已经存在的全局干员
          // TODO: 别过滤，用警告提醒用户就行
          .filter((favOperator) => !globalOperators.find((operator) => operator.id === favOperator.id))

        edit(() => {
          if (mode === 'append') {
            set(groupAtom, (prev) => ({
              ...prev,
              name: favGroup.name,
              opers: [
                ...prev.opers,
                // 过滤掉组内干员
                ...favOperators.filter((favOperator) => !prev.opers.find((operator) => operator.id === favOperator.id)),
              ],
            }))
          } else {
            set(groupAtom, (prev) => ({
              ...prev,
              name: favGroup.name,
              opers: favOperators,
            }))
          }
          return {
            action: 'set-group-from-fav',
            desc: i18n.actions.editor2.set_group_from_fav,
          }
        })
      },
      [edit],
    ),
  )
  return applyFavoriteGroup
}

export class FavoriteGroupOperatorsConflictError extends Error {
  name = 'FavoriteGroupOperatorsConflictError'
}
