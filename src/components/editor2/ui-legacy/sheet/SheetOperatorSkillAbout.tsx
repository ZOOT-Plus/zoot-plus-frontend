import { Button, Classes, FormGroup, Icon, PopoverNext, Tooltip } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC, FormEvent, useEffect, useState } from 'react'

import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { operatorSkillUsages } from '../../../../models/operator'
import { useTranslation } from '../../../../i18n/i18n'
import { LegacyNumericInput } from '../LegacyNumericInput'
import { LegacySkillUsageSelect } from '../LegacySkillUsageSelect'
import { Operator } from './types'

const needSkillTimeType = CopilotDocV1.SkillUsageType.ReadyToUseTimes

export interface SkillAboutProps {
  operator?: Operator
  onSkillChange?: (value: Operator) => void
}

export const SkillAboutTrigger: FC<SkillAboutProps> = ({ operator, onSkillChange }) => {
  const t = useTranslation()
  const [skill, setSkill] = useState(1)
  const [skillUsage, setSkillUsage] = useState(CopilotDocV1.SkillUsageType.None)
  const [skillTimes, setSkillTimes] = useState(1)

  useEffect(() => {
    setSkill(operator?.skill ?? 1)
    setSkillUsage(operator?.skillUsage ?? CopilotDocV1.SkillUsageType.None)
    setSkillTimes(operator?.skillTimes ?? 1)
  }, [operator])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!operator) return
    onSkillChange?.({
      ...operator,
      skill: skill || 1,
      skillUsage: skillUsage || CopilotDocV1.SkillUsageType.None,
      skillTimes: skillUsage === needSkillTimeType ? skillTimes || 1 : undefined,
    })
  }

  const SkillAboutForm = (
    <form onSubmit={onSubmit}>
      <div onClick={(event) => event.stopPropagation()} role="presentation">
        <div className="flex flex-wrap">
          <FormGroup label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill}>
            <LegacyNumericInput intOnly min={1} max={3} value={skill} onValueChange={setSkill} />
          </FormGroup>
          <FormGroup label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill_usage}>
            <LegacySkillUsageSelect value={skillUsage} onChange={setSkillUsage} />
          </FormGroup>
        </div>
        {skillUsage === needSkillTimeType && (
          <FormGroup label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill_usage_count}>
            <LegacyNumericInput intOnly min={1} value={skillTimes} onValueChange={setSkillTimes} />
          </FormGroup>
        )}
      </div>
      <div className="flex items-center">
        <Button
          text={t.components.editor.operator.sheet.SheetOperatorSkillAbout.confirm}
          type="submit"
          className={Classes.POPOVER_DISMISS}
        />
        <Tooltip
          content={t.components.editor.operator.sheet.SheetOperatorSkillAbout.default_settings_tooltip}
          className="ml-1"
        >
          <Icon icon="help" />
        </Tooltip>
      </div>
    </form>
  )
  const SkillAboutTrigger = (
    <div className={clsx('flex mt-1 text-gray-500 items-center text-xs', operator && 'hover:text-black')}>
      {!operator?.skill && <Icon icon="info-sign" size={12} className="flex items-center mr-1" />}
      <p>
        {operator?.skill
          ? t.models.operator.skill_number({ count: operator.skill })
          : t.components.editor.operator.sheet.SheetOperatorSkillAbout.not_set}
        {operator?.skillUsage !== undefined && ' ·'}
      </p>
      {operator?.skillUsage !== undefined && (
        <Icon
          icon={operatorSkillUsages.find((item) => item.value === operator.skillUsage)?.icon}
          className="flex items-center ml-1"
          size={12}
        />
      )}
      {operator?.skillTimes && <p>×{operator.skillTimes}</p>}
    </div>
  )

  return (
    <div
      onClick={(event) => {
        if (operator) event.stopPropagation()
      }}
      role="presentation"
      className="cursor-pointer"
    >
      <PopoverNext content={SkillAboutForm} disabled={!operator}>
        {SkillAboutTrigger}
      </PopoverNext>
    </div>
  )
}
