import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { i18n } from '../../../i18n/i18n'
import { getLocalizedOperatorName } from '../../../models/operator'
import { AppToaster } from '../../Toaster'
import { EditorOperator, editorAtoms, useEdit } from '../editor-state'
import { MAX_ACTIVE_OPERATORS } from './constants'

export function useAddOperator() {
  const edit = useEdit()
  return useAtomCallback(
    useCallback(
      (get, set, operator: EditorOperator) => {
        const operators = get(editorAtoms.operators)
        if (operators.length >= MAX_ACTIVE_OPERATORS) {
          AppToaster.show({
            message: i18n.components.editor2.misc.operator_limit_reached({
              limit: MAX_ACTIVE_OPERATORS,
            }),
            intent: 'danger',
          })
          return
        }
        const operatorNames = operators.map((op) => op.name)
        if (operatorNames.includes(operator.name)) {
          AppToaster.show({
            message: i18n.components.editor2.misc.already_exists({
              name: getLocalizedOperatorName(
                operator.name,
                i18n.currentLanguage,
              ),
            }),
            intent: 'danger',
          })
          return
        }
        edit(() => {
          set(editorAtoms.operatorAtoms, {
            type: 'insert',
            value: operator,
          })
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
