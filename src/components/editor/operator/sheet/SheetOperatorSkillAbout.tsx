import { Button, Classes, Icon } from '@blueprintjs/core'
import { Popover2, Tooltip2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useForm } from 'react-hook-form'

import { FormField2 } from 'components/FormField'
import { DetailedSelectChoice } from 'components/editor/DetailedSelect'
import { CopilotDocV1 } from 'models/copilot.schema'
import { operatorSkillUsages } from 'models/operator'

import { useTranslation } from '../../../../i18n/i18n'
import { EditorOperatorSkill } from '../EditorOperatorSkill'
import { EditorOperatorSkillTimes } from '../EditorOperatorSkillTimes'
import { EditorOperatorSkillUsage } from '../EditorOperatorSkillUsage'
import { Operator } from '../EditorSheet'

const needSkillTimeType = CopilotDocV1.SkillUsageType.ReadyToUseTimes

export interface SkillAboutProps {
  operator?: Operator
  onSkillChange?: (value: Operator) => void
}

const skillDic = operatorSkillUsages as DetailedSelectChoice[]

export const SkillAboutTrigger = ({ operator, onSkillChange }: SkillAboutProps) => {
  const t = useTranslation()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Operator>({
    defaultValues: operator,
  })

  const skillUsage = watch('skillUsage')
  const needSkillTime = skillUsage === needSkillTimeType

  const SkillAboutForm = (
    <form
      onSubmit={handleSubmit(({ skill, skillTimes, skillUsage }) =>
        onSkillChange?.({
          ...operator!,
          ...{
            skill: skill || 1,
            skillUsage: skillUsage || 0,
            skillTimes: needSkillTime ? skillTimes || 1 : undefined,
          },
        }),
      )}
    >
      <div onClick={(e) => e.stopPropagation()} role="presentation">
        <div className="flex flex-wrap">
          <FormField2
            label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill}
            field="skill"
            error={errors.skill}
            className="mr-1"
          >
            <EditorOperatorSkill control={control} name="skill" />
          </FormField2>
          <FormField2
            label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill_usage}
            field="skillUsage"
            error={errors.skillUsage}
          >
            <EditorOperatorSkillUsage control={control} name="skillUsage" />
          </FormField2>
        </div>

        {needSkillTime && (
          <FormField2
            label={t.components.editor.operator.sheet.SheetOperatorSkillAbout.skill_usage_count}
            field="skillTimes"
            error={errors.skillTimes}
          >
            <EditorOperatorSkillTimes control={control} name="skillTimes" />
          </FormField2>
        )}
      </div>
      <div className="flex items-center">
        <Button
          text={t.components.editor.operator.sheet.SheetOperatorSkillAbout.confirm}
          type="submit"
          className={Classes.POPOVER_DISMISS}
        />
        <Tooltip2
          content={t.components.editor.operator.sheet.SheetOperatorSkillAbout.default_settings_tooltip}
          className="ml-1"
        >
          <Icon icon="help" />
        </Tooltip2>
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
          icon={skillDic.find((item) => item.value === operator.skillUsage)?.icon}
          className="flex items-center ml-1"
          size={12}
        />
      )}
      {operator?.skillTimes && <p>×{operator.skillTimes}</p>}
    </div>
  )

  return (
    <div
      onClick={(e) => {
        if (operator) e.stopPropagation()
      }}
      role="presentation"
      className="cursor-pointer"
    >
      <Popover2 content={SkillAboutForm} disabled={!operator}>
        {SkillAboutTrigger}
      </Popover2>
    </div>
  )
}
