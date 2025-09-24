import { defaults, uniqueId } from 'lodash-es'
import { SetRequired } from 'type-fest'

import { CopilotDocV1 } from '../../models/copilot.schema'
import { EditorAction, EditorOperator } from './types'

export function createAction(
  initialValues: SetRequired<Partial<Omit<EditorAction, 'id'>>, 'type'>,
): EditorAction {
  const action: EditorAction = defaults({ id: uniqueId() }, initialValues)
  if (action.type === CopilotDocV1.Type.SkillUsage && action.skillUsage === undefined) {
    action.skillUsage = CopilotDocV1.SkillUsageType.ReadyToUse
  }
  return action
}

export function createOperator(
  initialValues: Omit<EditorOperator, 'id'>,
): EditorOperator {
  return defaults({ id: uniqueId() }, initialValues)
}
