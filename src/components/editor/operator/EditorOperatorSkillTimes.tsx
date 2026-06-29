import { useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { NumericInput2 } from '../NumericInput2'

export const EditorOperatorSkillTimes = <T extends CopilotDocV1.Operator | CopilotDocV1.ActionSkillUsage>({
  name,
  control,
  ...controllerProps
}: EditorFieldProps<T, CopilotDocV1.SkillTimes>) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value },
  } = useController({
    name,
    control,
    ...controllerProps,
  })

  return (
    <NumericInput2
      intOnly
      defaultValue={0}
      onValueChange={(val) => onChange(Math.min(val, 100))}
      onBlur={onBlur}
      placeholder={t.components.editor.operator.EditorOperatorSkillTimes.skill_usage_count}
      value={typeof value === 'object' ? '' : (value ?? '')}
      large
      min={1}
      max={100}
    />
  )
}
