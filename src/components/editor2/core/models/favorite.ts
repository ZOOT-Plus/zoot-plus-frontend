import { atom, PrimitiveAtom, useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { isEqual, omit, uniqueId } from 'lodash-es'
import { useCallback } from 'react'
import { SetOptional } from 'type-fest'

import { i18n } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { FavGroup, favGroupAtom, ignoreKeyDic } from '../../../../store/useFavGroups'
import { FavOperator, favOperatorAtom, operatorIgnoreKeyDic } from '../../../../store/useFavOperators'
import { AppToaster } from '../../../Toaster'
import { editorAtoms, useEdit } from '../../core/editor-state'
import { createOperator } from '../../core/models/operator'
import { EditorGroup, EditorOperator } from '../editor-state'
import { WithId } from '../reconciliation'

export function toFavOperator(operator: CopilotDocV1.Operator | EditorOperator | WithId<FavOperator>): FavOperator {
  return omit(operator, [...operatorIgnoreKeyDic]) as FavOperator
}

export function toFavGroup(group: CopilotDocV1.Group | EditorGroup | WithId<FavGroup>): FavGroup {
  return {
    ...omit(group, ...ignoreKeyDic),
    ...(group.opers ? { opers: group.opers.map((op) => toFavOperator(op)) } : {}),
  }
}

const favOperatorCache = new WeakMap<FavOperator, WithId<FavOperator>>()
const favOperatorReverseCache = new WeakMap<WithId<FavOperator> | EditorOperator, FavOperator>()
const mapFavOperatorWithId = (operator: FavOperator): WithId<FavOperator> => {
  const cached = favOperatorCache.get(operator)
  if (cached) {
    return cached
  }
  const newOperator = { ...operator, id: uniqueId() }
  favOperatorCache.set(operator, newOperator)
  favOperatorReverseCache.set(newOperator, operator)
  return newOperator
}

export const editorFavOperatorsAtom = atom(
  (get) => get(favOperatorAtom).map(mapFavOperatorWithId),
  (
    _get,
    set,
    update:
      | (WithId<FavOperator> | EditorOperator)[]
      | ((prev: WithId<FavOperator>[]) => (WithId<FavOperator> | EditorOperator)[]),
  ) => {
    set(favOperatorAtom, (prev) => {
      const resolved = typeof update === 'function' ? update(prev.map(mapFavOperatorWithId)) : update
      const newOperators = resolved.map((operator) => {
        const cached = favOperatorReverseCache.get(operator)
        if (cached) {
          return cached
        }
        const newOperator = toFavOperator(operator)
        favOperatorCache.set(newOperator, operator)
        favOperatorReverseCache.set(operator, newOperator)
        return newOperator
      })

      // 检查有没有多余的属性
      0 as unknown as FavOperator[] satisfies typeof newOperators
      return newOperators
    })
  },
)

const favGroupCache = new WeakMap<FavGroup, WithId<FavGroup>>()
const favGroupReverseCache = new WeakMap<WithId<FavGroup> | EditorGroup, FavGroup>()
const mapFavGroupWithId = (group: FavGroup): WithId<FavGroup> => {
  const cached = favGroupCache.get(group)
  if (cached) {
    return cached
  }
  const newGroup = { ...group, id: uniqueId() }
  favGroupCache.set(group, newGroup)
  favGroupReverseCache.set(newGroup, group)
  return newGroup
}

export const editorFavGroupsAtom = atom(
  (get) => get(favGroupAtom).map(mapFavGroupWithId),
  (
    _get,
    set,
    update: (WithId<FavGroup> | EditorGroup)[] | ((prev: WithId<FavGroup>[]) => (WithId<FavGroup> | EditorGroup)[]),
  ) => {
    set(favGroupAtom, (prev) => {
      const resolved = typeof update === 'function' ? update(prev.map(mapFavGroupWithId)) : update
      const newGroups = resolved.map((group) => {
        const cached = favGroupReverseCache.get(group)
        if (cached) {
          return cached
        }
        const newGroup = toFavGroup(group)
        favGroupCache.set(newGroup, group)
        favGroupReverseCache.set(group, newGroup)
        return newGroup
      })

      // 检查有没有多余的属性
      0 as unknown as FavGroup satisfies SetOptional<(typeof newGroups)[number], 'opers'>
      return newGroups
    })
  },
)

export function useFavoriteOperatorControls() {
  const setFavOperators = useSetAtom(favOperatorAtom)
  const addFavoriteOperator = useCallback(
    (operator: EditorOperator) => {
      const target = toFavOperator(operator)
      setFavOperators((prev) => [...prev, target])
      AppToaster.show({
        message: i18n.components.editor2.OperatorItem.added_to_favorites,
        intent: 'success',
      })
    },
    [setFavOperators],
  )

  const removeFavoriteOperator = useCallback(
    (operator: CopilotDocV1.Operator | EditorOperator | WithId<FavOperator>) => {
      const target = toFavOperator(operator)
      setFavOperators((prev) => {
        const index = prev.findIndex((item) => isEqual(item, target))
        return index === -1 ? prev : prev.filter((_, i) => i !== index)
      })
      AppToaster.show({
        message: i18n.components.editor2.OperatorItem.removed_from_favorites,
        intent: 'success',
      })
    },
    [setFavOperators],
  )

  return { addFavoriteOperator, removeFavoriteOperator }
}

export function useFavoriteGroupControls() {
  const setFavGroups = useSetAtom(favGroupAtom)
  const addFavoriteGroup = useCallback(
    (group: EditorGroup) => {
      const target = toFavGroup(group)
      setFavGroups((prev) => [...prev, target])
      AppToaster.show({
        message: i18n.components.editor2.GroupItem.added_to_favorites,
        intent: 'success',
      })
    },
    [setFavGroups],
  )

  const removeFavoriteGroup = useCallback(
    (group: CopilotDocV1.Group | EditorGroup | WithId<FavGroup>) => {
      const target = toFavGroup(group)
      setFavGroups((prev) => {
        const index = prev.findIndex((item) => isEqual(item, target))
        return index === -1 ? prev : prev.filter((_, i) => i !== index)
      })
      AppToaster.show({
        message: i18n.components.editor2.GroupItem.removed_from_favorites,
        intent: 'success',
      })
    },
    [setFavGroups],
  )

  return { addFavoriteGroup, removeFavoriteGroup }
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
