import { Card, Elevation, Icon, NonIdealState } from '@blueprintjs/core'
import { UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { clsx } from 'clsx'

import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { Sortable, SortableItemProps } from '../../dnd'
import { CardDeleteOption, CardEditOption } from '../CardOptions'
import { EditorOperatorItem } from './EditorOperatorItem'

export type GroupWithIdentifiedOperators = Omit<CopilotDocV1.Group, 'opers'> & {
  opers: (CopilotDocV1.Operator & { id: UniqueIdentifier })[]
}

interface EditorGroupItemProps extends Partial<SortableItemProps> {
  group: CopilotDocV1.Group
  editing?: boolean
  onEdit?: () => void
  onRemove?: () => void
  getOperatorId: (operator: CopilotDocV1.Operator) => UniqueIdentifier
  isOperatorEditing?: (operator: CopilotDocV1.Operator) => boolean
  onOperatorEdit?: (operator: CopilotDocV1.Operator) => void
  onOperatorRemove?: (index: number) => void
}

export const EditorGroupItem = ({
  group,
  editing,
  getOperatorId,
  isOperatorEditing,
  onEdit,
  onRemove,
  onOperatorEdit,
  onOperatorRemove,
  isDragging,
  attributes,
  listeners,
}: EditorGroupItemProps) => {
  const t = useTranslation()

  return (
    <Card
      elevation={Elevation.TWO}
      className={clsx(editing && 'bg-gray-100', isDragging && 'invisible')}
      style={{ width: 'fit-content' }}
    >
      <SortableContext items={group.opers?.map(getOperatorId) || []} strategy={verticalListSortingStrategy}>
        <div className="flex items-start mb-2">
          <Icon
            className="cursor-grab active:cursor-grabbing p-1 -mt-1 -ml-2 rounded-[1px]"
            icon="drag-handle-vertical"
            {...attributes}
            {...listeners}
          />

          <h3 className="font-bold leading-none flex-grow">{group.name}</h3>

          <CardEditOption active={editing} onClick={onEdit} />
          <CardDeleteOption className="-mr-3" onClick={onRemove} />
        </div>

        <ul>
          {group.opers?.map((operator, i) => (
            <Sortable
              className="mb-2"
              key={getOperatorId(operator)}
              id={getOperatorId(operator)}
              data={{ type: 'operator' }}
            >
              {(attrs) => (
                <EditorOperatorItem
                  operator={operator}
                  editing={isOperatorEditing?.(operator)}
                  onEdit={() => onOperatorEdit?.(operator)}
                  onRemove={() => onOperatorRemove?.(i)}
                  {...attrs}
                />
              )}
            </Sortable>
          ))}
        </ul>

        {!group.opers?.length && (
          <NonIdealState>{t.components.editor.operator.EditorGroupItem.drag_operators_here}</NonIdealState>
        )}
      </SortableContext>
    </Card>
  )
}
