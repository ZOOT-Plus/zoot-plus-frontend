import { Button, Card, MenuItem } from '@blueprintjs/core'
import { Select2 } from '@blueprintjs/select'

import { FC, useMemo } from 'react'

import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { EditorPerformerGroup, EditorPerformerGroupProps } from './EditorPerformerGroup'
import { EditorPerformerOperator, EditorPerformerOperatorProps } from './EditorPerformerOperator'

export type PerformerType = 'operator' | 'group'

export interface EditorPerformerAddProps {
  mode: PerformerType
  operator?: CopilotDocV1.Operator
  group?: CopilotDocV1.Group
  groups: CopilotDocV1.Group[]
  onModeChange: (mode: PerformerType) => void
  onCancel: () => void
  submitOperator: EditorPerformerOperatorProps['submit']
  submitGroup: EditorPerformerGroupProps['submit']
}

interface PerformerSelectItem {
  label: string
  value: PerformerType
}

export const EditorPerformerAdd: FC<EditorPerformerAddProps> = ({
  mode,
  operator,
  group,
  groups,
  onModeChange,
  onCancel,
  submitOperator,
  submitGroup,
}) => {
  const t = useTranslation()

  const performerSelectItems: PerformerSelectItem[] = useMemo(
    () => [
      {
        label: t.components.editor.operator.EditorPerformerAdd.operator,
        value: 'operator',
      },
      {
        label: t.components.editor.operator.EditorPerformerAdd.operator_group,
        value: 'group',
      },
    ],
    [t],
  )

  const selectedItem = performerSelectItems.find((item) => item.value === mode) || performerSelectItems[0]

  const selector = useMemo(
    () => (
      <>
        {t.components.editor.operator.EditorPerformerAdd.add}
        <Select2<PerformerSelectItem>
          filterable={false}
          items={performerSelectItems}
          className="ml-1"
          onItemSelect={(e) => onModeChange(e.value)}
          itemRenderer={(action, { handleClick, handleFocus }) => (
            <MenuItem
              key={action.value}
              selected={action.value === mode}
              onClick={handleClick}
              onFocus={handleFocus}
              text={action.label}
            />
          )}
        >
          <Button large text={selectedItem.label} rightIcon="double-caret-vertical" />
        </Select2>
      </>
    ),
    [mode, onModeChange, selectedItem, performerSelectItems, t],
  )

  const child = useMemo(() => {
    return mode === 'operator' ? (
      <EditorPerformerOperator
        operator={operator}
        submit={submitOperator}
        onCancel={onCancel}
        categorySelector={selector}
        groups={groups}
      />
    ) : (
      <EditorPerformerGroup group={group} submit={submitGroup} onCancel={onCancel} categorySelector={selector} />
    )
  }, [mode, submitOperator, submitGroup, group, groups, onCancel, operator, selector])

  return <Card className="mb-8 pt-4">{child}</Card>
}
