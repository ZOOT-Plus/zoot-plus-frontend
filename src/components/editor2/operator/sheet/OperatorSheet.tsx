import { produce } from 'immer'
import { useAtom } from 'jotai'
import { uniqueId } from 'lodash-es'

import { AppToaster } from 'components/Toaster'

import { i18n } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { SheetProvider } from '../../../editor/operator/sheet/SheetProvider'
import { OperatorFilterProvider } from '../../../editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'
import {
  EditorOperation,
  EditorOperator,
  editorAtoms,
  useEdit,
} from '../../editor-state'
import { createOperator } from '../../reconciliation'
import { MAX_ACTIVE_OPERATORS } from '../constants'
import { SheetList } from './SheetList'

// TODO: 兼容旧数据，目前仍保留重建逻辑
const ensureEditorOperator = (
  operation: EditorOperation,
  operator: CopilotDocV1.Operator,
): EditorOperator => {
  if (operator._id) {
    const { _id, ...rest } = operator
    return { ...rest, id: uniqueId() }
  }
  const matchedOperator = operation.opers.find(
    (op) => op.name === operator.name,
  )
  if (matchedOperator) {
    return matchedOperator
  }
  return { ...operator, id: uniqueId() }
}

export const OperatorSheet = () => {
  const [operators] = useAtom(editorAtoms.operators)
  const edit = useEdit()

  const submitOperator = (_operator: CopilotDocV1.Operator) => {
    edit((get, set, skip) => {
      let checkpoint = skip
      const operation = get(editorAtoms.operation)
      const operator = ensureEditorOperator(operation, _operator)
      const existingOperator = operation.opers.find(
        (op) => op.id === operator.id,
      )

      if (!existingOperator && operation.opers.length >= MAX_ACTIVE_OPERATORS) {
        AppToaster.show({
          message: i18n.components.editor2.misc.operator_limit_reached({
            limit: MAX_ACTIVE_OPERATORS,
          }),
          intent: 'danger',
        })
        return false
      }

      const newOperation = produce(operation, (draft) => {
        const targetOperator = draft.opers.find((op) => op.id === operator.id)
        if (targetOperator) {
          Object.assign(targetOperator, operator)
          checkpoint = {
            action: 'update-operator',
            desc: i18n.actions.editor2.update_operator,
          }
        } else {
          draft.opers.push(createOperator(operator))
          checkpoint = {
            action: 'add-operator',
            desc: i18n.actions.editor2.add_operator,
          }
        }
      })
      set(editorAtoms.operation, newOperation)
      return checkpoint
    })
    return true
  }

  const removeOperator = (index: number | number[] | undefined) => {
    if (index === undefined || index === -1) return
    if (typeof index === 'number') {
      index = [index]
    }
    edit((get, set) => {
      set(editorAtoms.operation, (operation) =>
        produce(operation, (draft) => {
          draft.opers = draft.opers.filter((_, i) => !index.includes(i))
        }),
      )
      return {
        action: 'remove-operator',
        desc: i18n.actions.editor2.delete_operator,
      }
    })
  }

  return (
    <SheetProvider
      submitOperator={submitOperator}
      submitGroup={() => false}
      existedOperators={operators}
      existedGroups={[]}
      removeOperator={removeOperator}
      removeGroup={() => {}}
    >
      <OperatorFilterProvider>
        <SheetList />
      </OperatorFilterProvider>
    </SheetProvider>
  )
}
