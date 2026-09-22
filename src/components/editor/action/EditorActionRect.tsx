import { useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FormField2 } from '../../FormField'
import { NumericInput2 } from '../NumericInput2'

interface EditorActionRectProps extends EditorFieldProps<CopilotDocV1.Action, [number, number, number, number]> {
  label: string
  required?: boolean
  requiredMessage?: string
}

// 720p 基准像素矩形 [x, y, w, h] 的通用输入，用于 Click 的 rect 与 Swipe 的 begin/end
export const EditorActionRect = ({
  name,
  control,
  label,
  required,
  requiredMessage,
  rules,
  ...controllerProps
}: EditorActionRectProps) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value },
    formState: { errors },
  } = useController({
    name,
    control,
    rules: {
      required: required && (requiredMessage ?? t.components.editor.action.EditorActionRect.rect_required),
      validate: (v) => {
        // v being undefined is allowed because the `required` rule will handle it properly
        if (v) {
          if (!(Array.isArray(v) && v.length === 4 && v.every((i) => Number.isFinite(i)))) {
            return t.components.editor.action.EditorActionRect.not_valid_rect
          }
        }
        return undefined
      },
      ...rules,
    },
    ...controllerProps,
  })

  const update = (index: number, v?: number) => {
    const next: [number | undefined, number | undefined, number | undefined, number | undefined] = [
      value?.[0],
      value?.[1],
      value?.[2],
      value?.[3],
    ]
    next[index] = v
    // if all are reset, reset the entire field
    if (next.every((i) => i === undefined)) {
      onChange(undefined)
    } else {
      onChange(next)
    }
  }

  const placeholders = [
    t.components.editor.action.EditorActionRect.x,
    t.components.editor.action.EditorActionRect.y,
    t.components.editor.action.EditorActionRect.w,
    t.components.editor.action.EditorActionRect.h,
  ]

  return (
    <FormField2 label={label} asterisk={required} field={name} error={errors[name]} className="mr-4">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <NumericInput2
            key={index}
            selectAllOnFocus
            intOnly
            min={0}
            buttonPosition="none"
            // blueprint.less 对 .bp6-numeric-input 的 input 削掉右圆角右边框以贴合自带 stepper，
            // 本组件无 stepper，用 important 恢复完整圆角
            inputClassName="!rounded-r-md"
            // Blueprint 输入框组的 width:100% 压过 Tailwind 宽度类，须用内联样式定宽
            style={{ width: 72 }}
            placeholder={placeholders[index]}
            stepSize={1}
            onValueChange={(v) => update(index, Number.isNaN(v) ? undefined : v)}
            onBlur={onBlur}
            value={value?.[index]?.toString() ?? ''}
          />
        ))}
      </div>
    </FormField2>
  )
}
