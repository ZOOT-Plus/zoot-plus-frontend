import { UseFormSetError } from 'react-hook-form'

import type { CopilotDocV1 } from 'models/copilot.schema'

import { i18n } from '../../../i18n/i18n'

export function validateAction(action: CopilotDocV1.Action, setError: UseFormSetError<CopilotDocV1.Action>) {
  if (action.type === 'Skill' || action.type === 'Retreat' || action.type === 'BulletTime') {
    if (!action.name && !action.location) {
      const error = {
        type: 'required',
        message: i18n.components.editor.action.validation.name_or_location_required,
      }
      setError('name', error)
      setError('location', error)
      return false
    }
  }

  // Click 的 rect 与 location 至少填一项；同填是合法的，MAA 会警告并优先使用 rect
  if (action.type === 'Click') {
    if (!action.rect && !action.location) {
      const error = {
        type: 'required',
        message: i18n.components.editor.action.validation.rect_or_location_required,
      }
      setError('rect', error)
      setError('location', error)
      return false
    }
  }

  return true
}
