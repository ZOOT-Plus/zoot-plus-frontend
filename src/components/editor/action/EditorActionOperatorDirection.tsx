import { Button, MenuItem } from '@blueprintjs/core'
import { Select2 } from '@blueprintjs/select'

import { useController } from 'react-hook-form'
import { SetOptional } from 'type-fest'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { OperatorDirection, operatorDirections } from '../../../models/operator'
import { FormField2 } from '../../FormField'

interface EditorActionOperatorDirectionProps extends SetOptional<
  EditorFieldProps<CopilotDocV1.Action, CopilotDocV1.Direction>,
  'name'
> {}

export const EditorActionOperatorDirection = ({
  name = 'direction',
  control,
  ...controllerProps
}: EditorActionOperatorDirectionProps) => {
  const t = useTranslation()
  const {
    field: { onChange, onBlur, value, ref },
    formState: { errors },
  } = useController({
    name,
    control,
    rules: {
      required: t.components.editor.action.EditorActionOperatorDirection.direction_required,
    },
    defaultValue: 'None' as CopilotDocV1.Direction.None,
    ...controllerProps,
  })

  const selected = operatorDirections.find((item) => item.value === value)

  return (
    <FormField2
      label={t.components.editor.action.EditorActionOperatorDirection.operator_direction}
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionOperatorDirection.direction_description}
    >
      <Select2<OperatorDirection>
        filterable={false}
        resetOnSelect={true}
        items={operatorDirections}
        itemRenderer={(action, { handleClick, handleFocus, modifiers }) => (
          <MenuItem
            selected={modifiers.active}
            key={action.value}
            onClick={handleClick}
            onFocus={handleFocus}
            icon={action.icon}
            text={action.title()}
          />
        )}
        onItemSelect={(item) => {
          onChange(item.value)
        }}
      >
        <Button
          icon={selected?.icon}
          text={selected?.title()}
          rightIcon="double-caret-vertical"
          onBlur={onBlur}
          ref={ref}
        />
      </Select2>
    </FormField2>
  )
}
