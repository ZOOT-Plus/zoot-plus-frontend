import { NonIdealState } from '@blueprintjs/core'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { uniqueId, unset } from 'lodash-es'
import { useState } from 'react'
import { Control, useFieldArray } from 'react-hook-form'

import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { Sortable } from '../../dnd'
import { EditorActionAdd, EditorActionAddProps } from './EditorActionAdd'
import { EditorActionItem } from './EditorActionItem'
import { validateAction } from './validation'

export interface EditorActionsProps {
  control: Control<CopilotDocV1.Operation>
}

const getId = (action: CopilotDocV1.Action) => {
  // normally the id will never be undefined, but we need to make TS happy as well as handing edge cases
  return (action._id ??= uniqueId())
}

export const EditorActions = ({ control }: EditorActionsProps) => {
  const t = useTranslation()
  const [draggingAction, setDraggingAction] = useState<CopilotDocV1.Action>()

  const { fields, append, insert, update, move, remove } = useFieldArray<
    CopilotDocV1.Operation,
    'actions',
    '_id'
  >({
    name: 'actions',
    control,
  })

  // upcast to prevent misuse of `.id`
  const actions = fields as unknown as CopilotDocV1.Action[]
  const appendAction = append as unknown as (value: CopilotDocV1.Action) => void
  const insertAction = insert as unknown as (
    index: number,
    value: CopilotDocV1.Action,
  ) => void
  const updateAction = update as unknown as (
    index: number,
    value: CopilotDocV1.Action,
  ) => void
  const moveAction = move as unknown as (from: number, to: number) => void
  const removeAction = remove as unknown as (index: number) => void

  const [editingAction, setEditingAction] = useState<CopilotDocV1.Action>()

  const isEditing = (action: CopilotDocV1.Action) =>
    editingAction?._id === action._id

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = ({ active }: DragEndEvent) => {
    setDraggingAction(actions.find((action) => getId(action) === active.id))
  }

  const handleDragOver = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const oldIndex = actions.findIndex((el) => getId(el) === active.id)
      const newIndex = actions.findIndex((el) => getId(el) === over.id)
      if (oldIndex !== -1 && newIndex !== -1) moveAction(oldIndex, newIndex)
    }
  }

  const handleDragEnd = () => {
    setDraggingAction(undefined)
  }

  const handleDuplicate = (index: number) => {
    const action = JSON.parse(JSON.stringify(actions[index]))
    action._id = uniqueId()
    unset(action, 'id')
    insertAction(index + 1, action)
  }

  const onSubmit: EditorActionAddProps['onSubmit'] = (action, setError) => {
    if (!validateAction(action, setError)) {
      return false
    }

    if (editingAction) {
      const index = actions.findIndex((field) => isEditing(field))
      if (index !== -1) {
        action._id = getId(editingAction)
        updateAction(index, action)
        setEditingAction(undefined)
      } else {
        setError('global' as any, {
          message:
            t.components.editor.action.EditorActions.update_action_not_found,
        })
        return false
      }
    } else {
      action._id = uniqueId()
      appendAction(action)
    }

    return true
  }

  return (
    <div className="flex flex-wrap md:flex-nowrap min-h-[calc(100vh-6rem)]">
      <div className="md:w-1/2 md:mr-8 w-full">
        <EditorActionAdd
          control={control}
          editingAction={editingAction}
          onSubmit={onSubmit}
          onCancel={() => setEditingAction(undefined)}
        />
      </div>

      <div className="  md:w-1/2 w-full">
        <div className="overflow-auto h-[calc(100vh-6rem)] p-2 pt-0 pb-8 -mx-2">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragEnd}
          >
            <SortableContext
              items={actions.map(getId)}
              strategy={verticalListSortingStrategy}
            >
              <ul>
                {actions.map((action, i) => (
                  <Sortable
                    id={getId(action)}
                    key={getId(action)}
                    className="mt-2"
                  >
                    {(attrs) => (
                      <EditorActionItem
                        action={action}
                        editing={isEditing(action)}
                        onEdit={() =>
                          setEditingAction(
                            isEditing(action) ? undefined : action,
                          )
                        }
                        onDuplicate={() => handleDuplicate(i)}
                        onRemove={() => removeAction(i)}
                        {...attrs}
                      />
                    )}
                  </Sortable>
                ))}
              </ul>
            </SortableContext>

            <DragOverlay>
              {draggingAction && (
                <EditorActionItem
                  editing={isEditing(draggingAction)}
                  action={draggingAction}
                />
              )}
            </DragOverlay>
          </DndContext>

          {actions.length === 0 && (
            <NonIdealState
              title={t.components.editor.action.EditorActions.no_actions}
              className=""
              icon="inbox"
            />
          )}
        </div>
      </div>
    </div>
  )
}
