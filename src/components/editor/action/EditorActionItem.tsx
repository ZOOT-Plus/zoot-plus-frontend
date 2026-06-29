import { Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC } from 'react'

import { CardTitle } from 'components/CardTitle'
import type { CopilotDocV1 } from 'models/copilot.schema'
import { findActionType } from 'models/types'

import { ActionCard } from '../../ActionCard'
import { SortableItemProps } from '../../dnd'
import { CardDeleteOption, CardDuplicateOption, CardEditOption } from '../CardOptions'

interface EditorActionItemProps extends Partial<SortableItemProps> {
  editing?: boolean
  action: CopilotDocV1.Action
  onEdit?: () => void
  onDuplicate?: () => void
  onRemove?: () => void
}

export const EditorActionItem: FC<EditorActionItemProps> = ({
  editing,
  action,
  onEdit,
  onDuplicate,
  onRemove,
  isDragging,
  attributes,
  listeners,
}) => {
  const type = findActionType(action.type)

  return (
    <ActionCard
      className={clsx(editing && 'bg-gray-100', isDragging && 'invisible')}
      action={action}
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
            <CardEditOption active={editing} onClick={onEdit} />
            <CardDuplicateOption onClick={onDuplicate} />
            <CardDeleteOption onClick={onRemove} />
          </CardTitle>
        </div>
      }
    />
  )
}
