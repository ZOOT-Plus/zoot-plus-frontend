import { Button, Card, Elevation, Icon, Menu, MenuItem, NonIdealState, PopoverNext } from '@blueprintjs/core'
import { SortableContext } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { FC } from 'react'

import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { findOperatorByName, getLocalizedOperatorName, getSkillUsageTitle } from '../../../models/operator'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Sortable, SortableItemProps } from '../../dnd'
import { EditorGroup, EditorOperator } from '../core/editor-state'

interface LegacyOperatorCardProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  editing?: boolean
  onEdit?: () => void
  onRemove?: () => void
}

export const LegacyOperatorCard: FC<LegacyOperatorCardProps> = ({
  operator,
  editing,
  onEdit,
  onRemove,
  isDragging,
  attributes,
  listeners,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const id = findOperatorByName(operator.name)?.id
  const skillUsage = getSkillUsageTitle(operator.skillUsage ?? CopilotDocV1.SkillUsageType.None, operator.skillTimes)

  return (
    <Card
      elevation={Elevation.TWO}
      className={clsx(
        editing && 'bg-gray-100 dark:bg-gray-700',
        isDragging && 'opacity-30',
        'flex items-start h-[72px] w-[calc(4.5*72px)]',
      )}
    >
      <Icon
        className="cursor-grab active:cursor-grabbing p-1 -mt-1 -ml-2 mr-3 rounded-[1px]"
        icon="drag-handle-vertical"
        {...attributes}
        {...listeners}
      />
      <OperatorAvatar id={id} size="large" />
      <div className="ml-4 flex-grow min-w-0">
        <h3 className="font-bold leading-none mb-1 truncate">{getLocalizedOperatorName(operator.name, language)}</h3>
        <div className="text-gray-400 text-xs">
          {t.components.editor.operator.EditorOperatorItem.skill_number({ count: operator.skill })}: {skillUsage}
        </div>
      </div>
      <Button
        minimal
        icon="edit"
        title={t.components.editor.CardOptions.edit}
        className={clsx('-my-2', editing && 'text-primary')}
        onClick={onEdit}
      />
      <DeleteOption onClick={onRemove} />
    </Card>
  )
}

interface LegacyGroupCardProps extends Partial<SortableItemProps> {
  group: EditorGroup
  editing?: boolean
  editingOperatorId?: string
  onEdit?: () => void
  onRemove?: () => void
  onOperatorEdit?: (operator: EditorOperator) => void
  onOperatorRemove?: (operator: EditorOperator) => void
}

export const LegacyGroupCard: FC<LegacyGroupCardProps> = ({
  group,
  editing,
  editingOperatorId,
  onEdit,
  onRemove,
  onOperatorEdit,
  onOperatorRemove,
  isDragging,
  attributes,
  listeners,
}) => {
  const t = useTranslation()

  return (
    <Card
      elevation={Elevation.TWO}
      className={clsx(editing && 'bg-gray-100 dark:bg-gray-700', isDragging && 'invisible')}
      style={{ width: 'fit-content' }}
    >
      <div className="flex items-start mb-2">
        <Icon
          className="cursor-grab active:cursor-grabbing p-1 -mt-1 -ml-2 rounded-[1px]"
          icon="drag-handle-vertical"
          {...attributes}
          {...listeners}
        />
        <h3 className="font-bold leading-none flex-grow">{group.name}</h3>
        <Button minimal icon="edit" title={t.components.editor.CardOptions.edit} onClick={onEdit} />
        <DeleteOption onClick={onRemove} />
      </div>
      <SortableContext items={group.opers.map(({ id }) => id)}>
        <ul>
          {group.opers.map((operator) => (
            <Sortable
              className="mb-2"
              key={operator.id}
              id={operator.id}
              data={{ type: 'operator', container: group.id }}
            >
              {(attrs) => (
                <LegacyOperatorCard
                  operator={operator}
                  editing={editingOperatorId === operator.id}
                  onEdit={() => onOperatorEdit?.(operator)}
                  onRemove={() => onOperatorRemove?.(operator)}
                  {...attrs}
                />
              )}
            </Sortable>
          ))}
        </ul>
      </SortableContext>
      {!group.opers.length && (
        <NonIdealState>{t.components.editor.operator.EditorGroupItem.drag_operators_here}</NonIdealState>
      )}
    </Card>
  )
}

const DeleteOption: FC<{ onClick?: () => void }> = ({ onClick }) => {
  const t = useTranslation()
  return (
    <PopoverNext
      placement="right"
      content={
        <Menu className="p-0">
          <MenuItem intent="danger" text={t.components.editor.CardOptions.delete} icon="trash" onClick={onClick} />
        </Menu>
      }
    >
      <Button minimal icon="trash" title={t.components.editor.CardOptions.delete} className="-my-2" />
    </PopoverNext>
  )
}
