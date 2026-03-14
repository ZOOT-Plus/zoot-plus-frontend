import { NumericInputProps } from '@blueprintjs/core'

import { isNil } from 'lodash-es'
import { FieldValues, useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'

import { useTranslation } from '../../i18n/i18n'
import { FieldResetButton } from '../FieldResetButton'
import { NumericInput2 } from './NumericInput2'

export interface EditorIntegerInputProps<T extends FieldValues>
  extends EditorFieldProps<T, number> {
  NumericInputProps: Omit<
    NumericInputProps,
    'name' | 'inputRef' | 'onValueChange' | 'onBlur'
  >
}

export const EditorIntegerInput = <T extends FieldValues>({
  name,
  control,
  rules,
  NumericInputProps,
  ...controllerProps
}: EditorIntegerInputProps<T>) => {
  const t = useTranslation()
  const { min } = NumericInputProps

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { isDirty },
  } = useController({
    name,
    control,
    ...controllerProps,
    rules: {
      min: isNil(min)
        ? undefined
        : {
            value: min,
            message: t.components.editor.EditorIntegerInput.min_value({
              min,
            }),
          },
      ...rules,
    },
  })

  const hasValue = !isNil(value) && value !== ''

  return (
    <NumericInput2
      intOnly
      selectAllOnFocus
      minorStepSize={null}
      name={name}
      inputRef={ref}
      onValueChange={(value) => onChange(value)}
      onBlur={onBlur}
      value={isNil(value) || Number.isNaN(value) ? '' : value}
      rightElement={
        <FieldResetButton disabled={!hasValue} onReset={() => onChange('')} />
      }
      {...NumericInputProps}
    />
  )
}
