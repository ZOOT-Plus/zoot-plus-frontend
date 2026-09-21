import { Button, Checkbox, Icon, PopoverInteractionKind, Tooltip } from '@blueprintjs/core'

import { Control, useController } from 'react-hook-form'

import { DetailedSelect, DetailedSelectChoice } from 'components/editor/DetailedSelect'
import { FormField2 } from 'components/FormField'
import { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { findOperatorDirection } from '../../../models/operator'
import { NumericInput2 } from '../NumericInput2'

// Swipe 的可选参数：duration / extra_swipe / slope_in / slope_out / with_pause / high_resolution_swipe_fix，
// 语义与 MAA 协议一致，全部留空即不导出、由 MAA 取默认值
export const EditorActionSwipeParams = ({ control }: { control: Control<CopilotDocV1.Action> }) => {
  const t = useTranslation()

  const {
    field: { onChange: onDurationChange, value: duration },
  } = useController({ control, name: 'duration' })
  const {
    field: { onChange: onExtraSwipeChange, value: extraSwipe },
  } = useController({ control, name: 'extraSwipe' })
  const {
    field: { onChange: onSlopeInChange, value: slopeIn },
  } = useController({ control, name: 'slopeIn' })
  const {
    field: { onChange: onSlopeOutChange, value: slopeOut },
  } = useController({ control, name: 'slopeOut' })
  const {
    field: { onChange: onWithPauseChange, value: withPause },
  } = useController({ control, name: 'withPause' })
  const {
    field: { onChange: onHighResFixChange, value: highResolutionSwipeFix },
  } = useController({ control, name: 'highResolutionSwipeFix' })

  const extraSwipeItems: DetailedSelectChoice[] = [
    { type: 'choice', value: 0, title: t.components.editor.action.EditorActionSwipeParams.extra_swipe_disabled },
    { type: 'choice', value: 1, icon: 'arrow-up', title: findOperatorDirection(CopilotDocV1.Direction.Up).title() },
    { type: 'choice', value: 2, icon: 'arrow-down', title: findOperatorDirection(CopilotDocV1.Direction.Down).title() },
    { type: 'choice', value: 3, icon: 'arrow-left', title: findOperatorDirection(CopilotDocV1.Direction.Left).title() },
    {
      type: 'choice',
      value: 4,
      icon: 'arrow-right',
      title: findOperatorDirection(CopilotDocV1.Direction.Right).title(),
    },
  ]

  const numericInputProps = {
    selectAllOnFocus: true,
    intOnly: true,
    min: 0,
    stepSize: 1,
    buttonPosition: 'none' as const,
    // blueprint.less 对 .bp6-numeric-input 的 input 削掉右圆角右边框以贴合自带 stepper，
    // 本组件无 stepper，用 important 恢复完整圆角
    inputClassName: '!rounded-r-md',
    // Blueprint 输入框组的 width:100% 压过 Tailwind 宽度类，须用内联样式定宽
    style: { width: 96 },
  } as const

  return (
    <div className="flex flex-wrap items-start gap-y-2">
      <FormField2 label={t.components.editor.action.EditorActionSwipeParams.duration} field="duration" className="mr-4">
        <NumericInput2
          {...numericInputProps}
          placeholder="0"
          onValueChange={(v) => onDurationChange(Number.isNaN(v) ? undefined : v)}
          value={duration?.toString() ?? ''}
        />
      </FormField2>

      <FormField2
        label={t.components.editor.action.EditorActionSwipeParams.extra_swipe}
        field="extraSwipe"
        className="mr-4"
      >
        <DetailedSelect
          items={extraSwipeItems}
          value={extraSwipe ?? 0}
          onItemSelect={(item) => {
            // 0 是默认值（不启用），只在选择方向时导出
            onExtraSwipeChange(item.value === 0 ? undefined : item.value)
          }}
        >
          <Button
            text={(() => {
              // 未选方向时按 0（不启用）回显
              const title = extraSwipeItems.find((i) => i.value === (extraSwipe ?? 0))?.title
              return typeof title === 'function' ? title() : title
            })()}
            rightIcon="double-caret-vertical"
          />
        </DetailedSelect>
      </FormField2>

      <FormField2 label={t.components.editor.action.EditorActionSwipeParams.slope_in} field="slopeIn" className="mr-4">
        <NumericInput2
          {...numericInputProps}
          placeholder="10"
          onValueChange={(v) => onSlopeInChange(Number.isNaN(v) ? undefined : v)}
          value={slopeIn?.toString() ?? ''}
        />
      </FormField2>

      <FormField2
        label={t.components.editor.action.EditorActionSwipeParams.slope_out}
        field="slopeOut"
        className="mr-4"
      >
        <NumericInput2
          {...numericInputProps}
          placeholder="10"
          onValueChange={(v) => onSlopeOutChange(Number.isNaN(v) ? undefined : v)}
          value={slopeOut?.toString() ?? ''}
        />
      </FormField2>

      <Checkbox
        className="mt-2 mr-4"
        label={t.components.editor.action.EditorActionSwipeParams.with_pause}
        checked={!!withPause}
        onChange={(e) => onWithPauseChange(e.target.checked ? true : undefined)}
      />
      <Checkbox
        className="mt-2"
        labelElement={
          <span>
            {t.components.editor.action.EditorActionSwipeParams.high_resolution_swipe_fix}
            <Tooltip
              className="!inline-block !mt-0"
              interactionKind={PopoverInteractionKind.HOVER}
              content={t.components.editor.action.EditorActionSwipeParams.high_resolution_swipe_fix_tip}
            >
              <Icon className="ml-1 text-slate-600 dark:text-slate-100" icon="help" />
            </Tooltip>
          </span>
        }
        checked={!!highResolutionSwipeFix}
        onChange={(e) => onHighResFixChange(e.target.checked ? true : undefined)}
      />
    </div>
  )
}
