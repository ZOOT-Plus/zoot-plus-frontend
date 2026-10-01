import { Button } from '@blueprintjs/core'
import { FC } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { operatorSkillUsages } from '../../../models/operator'
import { DetailedSelect, DetailedSelectChoice, DetailedSelectItem } from './DetailedSelect'

interface LegacySkillUsageSelectProps {
  value: CopilotDocV1.SkillUsageType
  onChange: (value: CopilotDocV1.SkillUsageType) => void
}

const skillUsageItems = operatorSkillUsages as unknown as DetailedSelectItem[]

export const LegacySkillUsageSelect: FC<LegacySkillUsageSelectProps> = ({ value, onChange }) => {
  const t = useTranslation()
  const selected = operatorSkillUsages.find((item) => item.type === 'choice' && item.value === value) as
    | DetailedSelectChoice
    | undefined

  return (
    <DetailedSelect
      items={skillUsageItems}
      value={selected?.value}
      onItemSelect={(item) => onChange(item.value as CopilotDocV1.SkillUsageType)}
    >
      <Button
        icon={selected?.icon || 'slash'}
        text={
          selected
            ? typeof selected.title === 'function'
              ? selected.title()
              : selected.title
            : t.components.editor.operator.EditorOperatorSkillUsage.select_skill_usage
        }
        rightIcon="double-caret-vertical"
      />
    </DetailedSelect>
  )
}
