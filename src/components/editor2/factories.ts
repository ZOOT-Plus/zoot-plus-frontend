import { defaults, uniqueId } from 'lodash-es'
import { SetRequired } from 'type-fest'

import { CopilotDocV1 } from '../../models/copilot.schema'
import { EditorAction, EditorOperator } from './types'

export function createAction(
  initialValues: SetRequired<Partial<EditorAction>, 'type'>,
): EditorAction {
  const action = defaults({ id: uniqueId() }, initialValues) as EditorAction
  if (
    action.type === CopilotDocV1.Type.SkillUsage &&
    action.skillUsage === undefined
  ) {
    action.skillUsage = CopilotDocV1.SkillUsageType.ReadyToUse
  }
  return action
}

export function createOperator(
  initialValues: Omit<EditorOperator, 'id'>,
): EditorOperator {
  return defaults({ id: uniqueId() }, initialValues)
}
