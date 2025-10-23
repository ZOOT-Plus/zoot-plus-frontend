import { Button } from '@blueprintjs/core'

import { useCallback, useEffect } from 'react'
import { SubmitHandler, UseFormSetError, useForm } from 'react-hook-form'

import { CardTitle } from 'components/CardTitle'
import { EditorResetButton } from 'components/editor/EditorResetButton'
import { FormError } from 'components/editor/FormError'
import { FormSubmitButton } from 'components/editor/FormSubmitButton'
import { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FormField2 } from '../../FormField'
import { EditorOperatorName } from './EditorOperator'
import { EditorOperatorGroupSelect } from './EditorOperatorGroupSelect'
import { EditorOperatorSkill } from './EditorOperatorSkill'
import { EditorOperatorSkillTimes } from './EditorOperatorSkillTimes'
import { EditorOperatorSkillUsage } from './EditorOperatorSkillUsage'

export interface EditorOperatorFormValues extends CopilotDocV1.Operator {
  groupName?: string
}

export interface EditorPerformerOperatorProps {
  operator?: CopilotDocV1.Operator
  groups: CopilotDocV1.Group[]
  submit: (
    values: EditorOperatorFormValues,
    setError?: UseFormSetError<EditorOperatorFormValues>,
    fromSheet?: boolean,
  ) => boolean
  onCancel: () => void
  categorySelector: JSX.Element
}

export const EditorPerformerOperator = ({
  operator,
  groups,
  submit,
  onCancel,
  categorySelector,
}: EditorPerformerOperatorProps) => {
  const t = useTranslation()
  const isNew = !operator

  const {
    control,
    reset,
    getValues,
    setValue,
    handleSubmit,
    setError,
    formState: { errors },
    watch,
  } = useForm<EditorOperatorFormValues>()

  const findGroupByOperator = useCallback(
    (operator?: CopilotDocV1.Operator) =>
      operator &&
      groups.find((group) =>
        group.opers?.find((op) => op._id === operator._id),
      ),
    [groups],
  )

  // when the outside operator changes, reset the entire form
  useEffect(() => {
    reset(
      {
        ...operator,
        groupName: findGroupByOperator(operator)?.name,
      },
      { keepDefaultValues: true },
    )
  }, [reset, operator, findGroupByOperator])

  // when groups change (meaning the operator's ownership may have changed from outside), update the groupName
  useEffect(() => {
    setValue('groupName', findGroupByOperator(getValues())?.name)
  }, [reset, getValues, groups, findGroupByOperator, setValue])

  const skillUsage = watch('skillUsage')
  useEffect(() => {
    setValue(
      'skillTimes',
      skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes
        ? (operator?.skillTimes ?? 1)
        : undefined,
    )
  }, [skillUsage, setValue, operator])

  const onSubmit: SubmitHandler<EditorOperatorFormValues> = (values) => {
    values.name = values.name.trim()
    values.groupName = values.groupName?.trim()
    values.skill = values.skill ? values.skill : 1
    values.skillUsage = values.skillUsage ? values.skillUsage : 0
    if (submit(values, setError)) {
      reset()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center mb-4">
        <CardTitle className="mb-0" icon="add">
          {categorySelector}
        </CardTitle>

        <div className="flex-1" />

        <EditorResetButton<CopilotDocV1.Operator>
          reset={reset}
          entityName={
            t.components.editor.operator.EditorPerformerOperator
              .editing_operator
          }
        />
      </div>

      <FormField2
        label={
          t.components.editor.operator.EditorPerformerOperator.operator_name
        }
        description={
          t.components.editor.operator.EditorPerformerOperator
            .operator_description
        }
        field="name"
        error={errors.name}
        asterisk
        FormGroupProps={{
          helperText:
            t.components.editor.operator.EditorPerformerOperator.search_hint,
        }}
      >
        <EditorOperatorName control={control} name="name" />
      </FormField2>

      <FormField2
        label={
          t.components.editor.operator.EditorPerformerOperator.group_membership
        }
        description={
          t.components.editor.operator.EditorPerformerOperator
            .group_membership_description
        }
        field="groupName"
        error={errors.groupName}
      >
        <EditorOperatorGroupSelect
          groups={groups}
          control={control}
          name="groupName"
        />
      </FormField2>

      <div className="flex flex-col lg:flex-row gap-2 flex-wrap">
        <FormField2
          label={t.components.editor.operator.EditorPerformerOperator.skill}
          field="skill"
          error={errors.skill}
        >
          <EditorOperatorSkill control={control} name="skill" />
        </FormField2>

        <FormField2
          label={
            t.components.editor.operator.EditorPerformerOperator.skill_usage
          }
          field="skillUsage"
          error={errors.skillUsage}
        >
          <EditorOperatorSkillUsage control={control} name="skillUsage" />
        </FormField2>

        {skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes && (
          <FormField2
            label={
              t.components.editor.operator.EditorPerformerOperator
                .skill_usage_count
            }
            field="skillTimes"
            error={errors.skillTimes}
          >
            <EditorOperatorSkillTimes control={control} name="skillTimes" />
          </FormField2>
        )}
      </div>

      <div className="flex">
        <FormSubmitButton control={control} icon={isNew ? 'add' : 'edit'}>
          {isNew
            ? t.components.editor.operator.EditorPerformerOperator.add
            : t.components.editor.operator.EditorPerformerOperator.save}
        </FormSubmitButton>

        {!isNew && (
          <Button icon="cross" className="ml-2" onClick={onCancel}>
            {t.components.editor.operator.EditorPerformerOperator.cancel_edit}
          </Button>
        )}
      </div>

      <FormError errors={errors} />
    </form>
  )
}
