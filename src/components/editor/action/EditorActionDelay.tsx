import { useFormState } from 'react-hook-form'
import { SetOptional } from 'type-fest'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import { EditorIntegerInput } from 'components/editor/EditorIntegerInput'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FormField2 } from '../../FormField'

interface EditorActionDelayProps extends SetOptional<EditorFieldProps<CopilotDocV1.Action, number>, 'name'> {}

export const EditorActionPreDelay = ({ name = 'preDelay', control, ...controllerProps }: EditorActionDelayProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionDelay.pre_delay}
      className="mr-2 lg:mr-4"
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionDelay.delay_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionDelay.pre_delay,
          min: 0,
          stepSize: 100,
          minorStepSize: 10,
          majorStepSize: 1000,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}

export const EditorActionRearDelay = ({ name = 'rearDelay', control, ...controllerProps }: EditorActionDelayProps) => {
  const t = useTranslation()
  const { errors } = useFormState({ control, name })

  return (
    <FormField2
      label={t.components.editor.action.EditorActionDelay.post_delay}
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionDelay.delay_description}
    >
      <EditorIntegerInput
        NumericInputProps={{
          placeholder: t.components.editor.action.EditorActionDelay.post_delay,
          min: 0,
          stepSize: 100,
          minorStepSize: 10,
          majorStepSize: 1000,
        }}
        control={control}
        name={name}
        {...controllerProps}
      />
    </FormField2>
  )
}
