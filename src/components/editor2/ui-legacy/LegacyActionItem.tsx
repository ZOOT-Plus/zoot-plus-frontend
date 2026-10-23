import { Button, Icon, Menu, MenuItem, PopoverNext } from '@blueprintjs/core'
import clsx from 'clsx'
import { FC } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { findActionType } from '../../../models/types'
import { ActionCard } from '../../ActionCard'
import { CardTitle } from '../../CardTitle'
import { SortableItemProps } from '../../dnd'
import { EditorAction } from '../core/editor-state'

interface LegacyActionItemProps extends Partial<SortableItemProps> {
  action: EditorAction
  rearDelay?: number
  editing?: boolean
  onEdit?: () => void
  onDuplicate?: () => void
  onRemove?: () => void
}

export const LegacyActionItem: FC<LegacyActionItemProps> = ({
  action,
  rearDelay,
  editing,
  onEdit,
  onDuplicate,
  onRemove,
  isDragging,
  attributes,
  listeners,
}) => {
  const t = useTranslation()
  const type = findActionType(action.type)

  return (
    <ActionCard
      className={clsx(editing && 'bg-gray-100 dark:bg-gray-700', isDragging && 'invisible')}
      action={
        {
          ...action,
          _id: action.id,
          preDelay: action.intermediatePostDelay,
          postDelay: rearDelay,
        } as unknown as CopilotDocV1.Action
      }
      title={
        <div className="flex items-center">
          <Icon
            className="cursor-grab active:cursor-grabbing p-1 -my-1 -ml-2 mr-2 rounded-[1px]"
            icon="drag-handle-vertical"
            {...attributes}
            {...listeners}
          />
          <CardTitle className="mb-0 flex-grow" icon={type.icon}>
            <span className="mr-2">{type.title()}</span>
            <Button minimal icon="edit" title={t.components.editor.CardOptions.edit} onClick={onEdit} />
            <Button minimal icon="duplicate" title={t.components.editor.CardOptions.duplicate} onClick={onDuplicate} />
            <PopoverNext
              placement="right"
              content={
                <Menu className="p-0">
                  <MenuItem
                    intent="danger"
                    text={t.components.editor.CardOptions.delete}
                    icon="trash"
                    onClick={onRemove}
                  />
                </Menu>
              }
            >
              <Button minimal icon="trash" title={t.components.editor.CardOptions.delete} />
            </PopoverNext>
          </CardTitle>
        </div>
      }
    />
  )
}
