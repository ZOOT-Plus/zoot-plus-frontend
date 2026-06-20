import { InputGroup } from '@blueprintjs/core'

import { useEffect } from 'react'
import { useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { Level } from '../../../models/operation'
import { useMessage } from '../../../utils/messenger'
import { FieldResetButton } from '../../FieldResetButton'
import { FormField2 } from '../../FormField'
import { useFloatingMap } from '../floatingMap/FloatingMapContext'
import { MAP_ORIGIN, TileClickMessage } from '../floatingMap/connection'

interface EditorActionOperatorLocationProps extends EditorFieldProps<CopilotDocV1.Action, [number, number]> {
  actionType: CopilotDocV1.Type
  level?: Level
}

export const EditorActionOperatorLocation = ({
  name,
  control,
  actionType,
  level,
  rules,
  ...controllerProps
}: EditorActionOperatorLocationProps) => {
  const t = useTranslation()
  const isRequired = actionType === 'Deploy'

  const {
    field: { onChange, value },
    formState: { errors },
  } = useController({
    name,
    control,
    rules: {
      required: isRequired && t.components.editor.action.EditorActionOperatorLocation.location_required,
      validate: (v) => {
        // v being undefined is allowed because the `required` rule will handle it properly
        if (v) {
          if (!(Array.isArray(v) && v.length === 2 && v.every((i) => i >= 0 && Number.isFinite(i)))) {
            return t.components.editor.action.EditorActionOperatorLocation.invalid_location
          }

          if (level) {
            if (v[0] >= level.width) {
              return t.components.editor.action.EditorActionOperatorLocation.x_out_of_range({ max: level.width - 1 })
            }
            if (v[1] >= level.height) {
              return t.components.editor.action.EditorActionOperatorLocation.y_out_of_range({ max: level.height - 1 })
            }
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

  const { setActiveTiles } = useFloatingMap()

  useEffect(() => {
    if (value?.[0] !== undefined && value?.[1] !== undefined) {
      setActiveTiles([{ x: value[0], y: value[1] }])
    } else {
      setActiveTiles([])
    }
  }, [value, setActiveTiles])

  // reset active tiles when unmounting
  useEffect(() => () => setActiveTiles([]), [setActiveTiles])

  useMessage<TileClickMessage>(MAP_ORIGIN, 'tileClick', (e) => {
    const [x, y] = e.message.data.maaLocation
    onChange([x, y])
  })

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
      label={t.components.editor.action.EditorActionOperatorLocation.operator_location}
      field="location"
      asterisk={isRequired}
      error={errors[name]}
      description={t.components.editor.action.EditorActionOperatorLocation.map_location_description}
      className="mr-4"
      FormGroupProps={{
        helperText: t.components.editor.action.EditorActionOperatorLocation.click_on_map,
      }}
    >
      <div className="flex">
        <InputGroup
          onChange={(v) => onChange(transform.fromX(castInteger(v.target.value)))}
          value={value?.[0]?.toString() ?? ''}
          placeholder={t.components.editor.action.EditorActionOperatorLocation.x_coordinate}
          className="mr-2"
          rightElement={
            <FieldResetButton disabled={value?.[0] === undefined} onReset={() => reset(transform.fromX(undefined))} />
          }
          onFocus={(e) => e.target.select()}
        />
        <InputGroup
          onChange={(v) => onChange(transform.fromY(castInteger(v.target.value)))}
          value={value?.[1]?.toString() ?? ''}
          placeholder={t.components.editor.action.EditorActionOperatorLocation.y_coordinate}
          rightElement={
            <FieldResetButton disabled={value?.[1] === undefined} onReset={() => reset(transform.fromY(undefined))} />
          }
          onFocus={(e) => e.target.select()}
        />
      </div>
    </FormField2>
  )
}

function castInteger(v: string | number) {
  const result = typeof v === 'number' ? v : parseInt(v)
  return result < 0 || !Number.isFinite(result) ? 0 : result
}
