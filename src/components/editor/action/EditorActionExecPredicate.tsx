import { useFormState } from 'react-hook-form'
import { SetOptional } from 'type-fest'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import { EditorIntegerInput } from 'components/editor/EditorIntegerInput'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FormField2 } from '../../FormField'

interface EditorActionExecPredicateProps extends SetOptional<EditorFieldProps<CopilotDocV1.Action, number>, 'name'> {}

export const EditorActionExecPredicateKills = ({
  name = 'kills',
  control,
  ...controllerProps
}: EditorActionExecPredicateProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionExecPredicate.kill_count_condition}
      className="mr-2 lg:mr-4"
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionExecPredicate.kill_count_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionExecPredicate.kill_count,
          min: 0,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}

export const EditorActionExecPredicateCosts = ({
  name = 'costs',
  control,
  ...controllerProps
}: EditorActionExecPredicateProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionExecPredicate.cost_condition}
      className="mr-2 lg:mr-4"
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionExecPredicate.cost_condition_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionExecPredicate.dp_cost,
          min: 0,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}

export const EditorActionExecPredicateCostChange = ({
  name = 'costChanges',
  control,
  ...controllerProps
}: EditorActionExecPredicateProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionExecPredicate.cost_change_condition}
      className="mr-2 lg:mr-4"
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionExecPredicate.cost_change_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionExecPredicate.dp_change_amount,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}

export const EditorActionExecPredicateCooling = ({
  name = 'cooling',
  control,
  ...controllerProps
}: EditorActionExecPredicateProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionExecPredicate.cooldown_operator_condition}
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionExecPredicate.cooldown_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionExecPredicate.cooldown_count,
          min: 0,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}
