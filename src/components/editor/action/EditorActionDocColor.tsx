import { Button, Icon, MenuItem } from '@blueprintjs/core'
import { Select } from '@blueprintjs/select'

import { useController } from 'react-hook-form'
import { SetOptional } from 'type-fest'

import { FormField2 } from 'components/FormField'
import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'
import { actionDocColors } from 'models/operator'

import { useTranslation } from '../../../i18n/i18n'

interface EditorActionDocColorProps extends SetOptional<EditorFieldProps<CopilotDocV1.Action, string>, 'name'> {}

export const EditorActionDocColor = ({ name = 'docColor', control, ...controllerProps }: EditorActionDocColorProps) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value, ref },
    formState: { errors },
  } = useController({
    name,
    control,
    defaultValue: 'Gray',
    ...controllerProps,
  })

  const selected = actionDocColors.find((item) => item.value === value)

  return (
    <FormField2
      label={t.components.editor.action.EditorActionDocColor.description_color}
      field={name}
      error={errors[name]}
      description={t.components.editor.action.EditorActionDocColor.color_description}
    >
      <Select
        filterable={false}
        items={actionDocColors}
        itemRenderer={(color, { handleClick, handleFocus, modifiers }) => (
          <MenuItem
            selected={modifiers.active}
            key={color.value}
            onClick={handleClick}
            onFocus={handleFocus}
            text={
              <span>
                <Icon icon="full-circle" color={color?.value} className="mr-2" />
                <span style={{ color: color?.value }}>{color?.title()}</span>
              </span>
            }
          />
        )}
        onItemSelect={(item) => {
          onChange(item.value)
        }}
        resetOnSelect={true}
      >
        <Button rightIcon="double-caret-vertical" onBlur={onBlur} ref={ref}>
          <Icon icon="full-circle" color={selected?.value} />
          <span style={{ color: selected?.value }}>{selected?.title()}</span>
        </Button>
      </Select>
    </FormField2>
  )
}
