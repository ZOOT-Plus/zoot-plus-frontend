import { produce } from 'immer'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { i18n } from '../../../i18n/i18n'
import { findOperatorById, getLocalizedOperatorName, identityFromInfo } from '../../../models/operator'
import { AppToaster } from '../../Toaster'
import { EditorOperator, editorAtoms, findExistingOperator, useEdit } from '../editor-state'
import { createOperator } from '../reconciliation'

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
