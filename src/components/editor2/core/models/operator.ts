import { Active, DragEndEvent, Over } from '@dnd-kit/core'
import { produce } from 'immer'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { defaults, defaultsDeep, uniqueId } from 'lodash-es'
import { i18n } from '../../../../i18n/i18n'
import {
  findOperatorById,
  findOperatorsByIdentity,
  getDefaultRequirements,
  getLocalizedOperatorName,
  identityFromInfo,
} from '../../../../models/operator'
import { AppToaster } from '../../../Toaster'
import { EditorOperator, editorAtoms, findExistingOperator, getEditorConfig, useEdit } from '../editor-state'

export function createOperator(
  initialValues: Omit<EditorOperator, 'id'>,
  applyDefaultRequirements = true,
): EditorOperator {
  const info = findOperatorsByIdentity(initialValues)[0]
  const shouldApplyDefaultRequirements = applyDefaultRequirements && info && info.prof !== 'TOKEN'
  let defaultRequirements: EditorOperator['requirements'] | undefined
  if (shouldApplyDefaultRequirements) {
    const rarity = info?.rarity ?? 6
    const preset = getEditorConfig().operatorPreset?.byRarity?.[rarity]
    if (preset) {
      defaultRequirements = {
        level: preset.level,
        elite: preset.elite,
      }
    }
    defaultRequirements = defaults(
      {},
      defaultRequirements,
      getDefaultRequirements(rarity) satisfies EditorOperator['requirements'],
    )
  }
  const operator: EditorOperator = defaultsDeep(
    { id: uniqueId() } satisfies Omit<EditorOperator, 'name'>,
    initialValues,
    { requirements: defaultRequirements } satisfies Omit<EditorOperator, 'id' | 'name'>,
  )
  return operator
}

export function useOperatorControl() {
  const edit = useEdit()
  const addOperator = useAtomCallback(
    useCallback(
      (get, set, operator: EditorOperator, groupId?: string) => {
        const existingOperator = findExistingOperator(
          { opers: get(editorAtoms.operators), groups: get(editorAtoms.groups) },
          operator,
        )
        if (existingOperator) {
          AppToaster.show({
            message: i18n.components.editor2.misc.already_exists({
              name: getLocalizedOperatorName(operator.name, i18n.currentLanguage),
            }),
            intent: 'danger',
          })
          return
        }
        edit(() => {
          if (groupId) {
            set(editorAtoms.groups, (groups) =>
              produce(groups, (draft) => {
                const group = draft.find((g) => g.id === groupId)
                if (group) {
                  group.opers.push(operator)
                }
              }),
            )
          } else {
            set(editorAtoms.operatorAtoms, {
              type: 'insert',
              value: operator,
            })
          }
          return {
            action: 'add-operator',
            desc: i18n.actions.editor2.add_operator,
          }
        })
      },
      [edit],
    ),
  )
  const addOperatorById = useCallback(
    (operatorId: string, groupId?: string) => {
      const info = findOperatorById(operatorId)
      if (!info) {
        console.error(`Operator with id ${operatorId} not found`)
        return
      }
      const identity = identityFromInfo(info)
      addOperator(createOperator(identity), groupId)
    },
    [addOperator],
  )
  const addOperatorByName = useCallback(
    (operatorName: string, groupId?: string) => {
      addOperator(createOperator({ name: operatorName }), groupId)
    },
    [addOperator],
  )

  return {
    addOperator,
    addOperatorById,
    addOperatorByName,
  }
}

export const globalOperatorContainerId = 'global'

export function useOperatorDragEnd() {
  const edit = useEdit()
  return useAtomCallback(
    useCallback(
      (get, set, { active, over }: DragEndEvent) => {
        const getType = (item: Active | Over) => item.data.current?.type as 'operator' | 'group'

        if (!over || active.id === over.id || getType(active) !== 'operator') {
          return
        }
        const operation = get(editorAtoms.operation)
        const newOperation = produce(operation, (draft) => {
          const locateOperator = (
            target: Active | Over,
          ): {
            container?: { opers: EditorOperator[] }
            index: number
          } => {
            if (getType(target) === 'operator') {
              for (const [index, operator] of draft.opers.entries()) {
                if (operator.id === target.id) return { container: draft, index }
              }
              for (const group of draft.groups) {
                for (const [index, operator] of group.opers.entries()) {
                  if (operator.id === target.id) return { container: group, index }
                }
              }
            } else {
              if (target.id === globalOperatorContainerId) {
                return { container: draft, index: -1 }
              }
              for (const group of draft.groups) {
                if (group.id === target.id) return { container: group, index: -1 }
              }
            }
            return { index: -1 }
          }

          const { container: activeContainer, index: activeIndex } = locateOperator(active)
          const { container: overContainer, index: overIndex } = locateOperator(over)
          if (!activeContainer || !overContainer || activeIndex === -1) return

          const activeOperator = activeContainer.opers.splice(activeIndex, 1)[0]

          let insertionIndex = overIndex
          if (overIndex === -1) {
            insertionIndex = overContainer.opers.length
          } else if (activeContainer !== overContainer) {
            if (active.rect.current.translated) {
              const activeCenter = active.rect.current.translated.left + active.rect.current.translated.width / 2
              const overCenter = over.rect.left + over.rect.width / 2
              if (activeCenter > overCenter) {
                insertionIndex += 1
              }
            }
          }

          overContainer.opers.splice(insertionIndex, 0, activeOperator)
        })

        if (newOperation !== operation) {
          edit(() => {
            set(editorAtoms.operation, newOperation)
            return {
              action: 'move-operator',
              desc: i18n.actions.editor2.move_operator,
            }
          })
        }
      },
      [edit],
    ),
  )
}
