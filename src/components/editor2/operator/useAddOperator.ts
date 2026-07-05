import { produce } from 'immer'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { i18n } from '../../../i18n/i18n'
import { getLocalizedOperatorName } from '../../../models/operator'
import { AppToaster } from '../../Toaster'
import { EditorOperator, editorAtoms, useEdit } from '../editor-state'

export function useAddOperator() {
  const edit = useEdit()
  return useAtomCallback(
    useCallback(
      (get, set, operator: EditorOperator, groupId?: string) => {
        const operatorNames = get(editorAtoms.operators).map((op) => op.name)
        const groupedOperatorNames = get(editorAtoms.groups).flatMap((g) => g.opers.map((op) => op.name))
        if (operatorNames.includes(operator.name) || groupedOperatorNames.includes(operator.name)) {
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
}
