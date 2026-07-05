import { Button } from '@blueprintjs/core'

import { useMemo } from 'react'
import { FieldValues, useController } from 'react-hook-form'

import { DetailedSelect, DetailedSelectChoice, DetailedSelectItem } from 'components/editor/DetailedSelect'
import { EditorFieldProps } from 'components/editor/EditorFieldProps'

import { useTranslation } from '../../../i18n/i18n'

export const EditorOperatorSelect = <T extends FieldValues>({ name, control }: EditorFieldProps<T>) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value, ref },
  } = useController({
    name,
    control,
    rules: {
      required: t.components.editor.operator.EditorOperatorSelect.please_select_operator,
    },
  })

  const menuItems: DetailedSelectItem[] = useMemo(
    () => [
      {
        type: 'header',
        header: t.components.editor.operator.EditorOperatorSelect.operator_deploy_retreat,
      },
      {
        type: 'choice',
        icon: 'new-object',
        title: t.components.editor.operator.EditorOperatorSelect.deploy,
        value: 'Deploy',
        description: t.components.editor.operator.EditorOperatorSelect.deploy_description,
      },
      {
        type: 'choice',
        icon: 'graph-remove',
        title: t.components.editor.operator.EditorOperatorSelect.retreat,
        value: 'Retreat',
        description: t.components.editor.operator.EditorOperatorSelect.retreat_description,
      },
      {
        type: 'header',
        header: t.components.editor.operator.EditorOperatorSelect.operator_skills,
      },
      {
        type: 'choice',
        icon: 'target',
        title: t.components.editor.operator.EditorOperatorSelect.use_skill,
        value: 'Skill',
        description: t.components.editor.operator.EditorOperatorSelect.use_skill_description,
      },
      {
        type: 'choice',
        icon: 'swap-horizontal',
        title: t.components.editor.operator.EditorOperatorSelect.switch_skill_usage,
        value: 'SkillUsage',
        description: t.components.editor.operator.EditorOperatorSelect.switch_skill_usage_description,
      },
      {
        type: 'header',
        header: t.components.editor.operator.EditorOperatorSelect.battle_control,
      },
      {
        type: 'choice',
        icon: 'fast-forward',
        title: t.components.editor.operator.EditorOperatorSelect.toggle_speed,
        value: 'SpeedUp',
        description: t.components.editor.operator.EditorOperatorSelect.toggle_speed_description,
      },
      {
        type: 'choice',
        icon: 'fast-backward',
        title: t.components.editor.operator.EditorOperatorSelect.bullet_time,
        value: 'BulletTime',
        description: t.components.editor.operator.EditorOperatorSelect.bullet_time_description,
      },
      {
        type: 'choice',
        icon: 'antenna',
        title: t.components.editor.operator.EditorOperatorSelect.auto_mode,
        value: 'SkillDaemon',
        description: t.components.editor.operator.EditorOperatorSelect.auto_mode_description,
      },
      {
        type: 'header',
        header: t.components.editor.operator.EditorOperatorSelect.miscellaneous,
      },
      {
        type: 'choice',
        icon: 'paragraph',
        title: t.components.editor.operator.EditorOperatorSelect.print_description,
        value: 'Ouput',
        description: t.components.editor.operator.EditorOperatorSelect.print_description_details,
      },
    ],
    [t],
  )
  const selectedAction = menuItems.find((action) => action.type === 'choice' && action.value === value) as
    | DetailedSelectChoice
    | undefined

  return (
    <DetailedSelect
      items={menuItems}
      onItemSelect={(item) => {
        onChange(item.value)
      }}
      value={selectedAction?.value}
    >
      <Button
        large
        icon={selectedAction?.icon || 'slash'}
        text={
          selectedAction
            ? typeof selectedAction.title === 'function'
              ? selectedAction.title()
              : selectedAction.title
            : t.components.editor.operator.EditorOperatorSelect.select_operator
        }
        rightIcon="double-caret-vertical"
        onBlur={onBlur}
        ref={ref}
      />
    </DetailedSelect>
  )
}
