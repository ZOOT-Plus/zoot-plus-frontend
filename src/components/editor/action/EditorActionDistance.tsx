import { useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FieldResetButton } from '../../FieldResetButton'
import { FormField2 } from '../../FormField'
import { NumericInput2 } from '../NumericInput2'

interface EditorActionDistanceProps extends EditorFieldProps<CopilotDocV1.Action, [number, number]> {}

export const EditorActionDistance = ({ name, control, rules, ...controllerProps }: EditorActionDistanceProps) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value },
    formState: { errors },
  } = useController({
    name,
    control,
    rules: {
      required: t.components.editor.action.EditorActionDistance.distance_required,
      validate: (v) => {
        // v being undefined is allowed because the `required` rule will handle it properly
        if (v) {
          if (!(Array.isArray(v) && v.length === 2 && v.every((i) => Number.isFinite(i)))) {
            return t.components.editor.action.EditorActionDistance.not_valid_number
          }
        }
        return undefined
      },
      ...rules,
    },
    ...controllerProps,
  })

  const transform: Record<string, (v?: number) => [number | undefined, number | undefined]> = {
    fromX: (v) => [v, value?.[1]],
    fromY: (v) => [value?.[0], v],
  }

  const reset = (value: [number | undefined, number | undefined]) => {
    // if both are reset, reset the entire field
    if (value[0] === undefined && value[1] === undefined) {
      onChange(undefined)
    } else {
      onChange(value)
    }
  }

  return (
    <FormField2
      asterisk
      label={t.components.editor.action.EditorActionDistance.movement_distance}
      field={name}
      error={errors[name]}
      className="mr-4"
    >
      <div className="flex">
        <NumericInput2
          selectAllOnFocus
          className="mr-2"
          placeholder={t.components.editor.action.EditorActionDistance.x_distance}
          stepSize={0.5}
          onValueChange={(value) => onChange(transform.fromX(value))}
          onBlur={onBlur}
          value={value?.[0]?.toString() ?? ''}
          rightElement={
            <FieldResetButton disabled={value?.[0] === undefined} onReset={() => reset(transform.fromX(undefined))} />
          }
        />

        <NumericInput2
          selectAllOnFocus
          placeholder={t.components.editor.action.EditorActionDistance.y_distance}
          stepSize={0.5}
          onValueChange={(value) => onChange(transform.fromY(value))}
          onBlur={onBlur}
          value={value?.[1]?.toString() ?? ''}
          rightElement={
            <FieldResetButton disabled={value?.[1] === undefined} onReset={() => reset(transform.fromY(undefined))} />
          }
        />
      </div>
    </FormField2>
  )
}
