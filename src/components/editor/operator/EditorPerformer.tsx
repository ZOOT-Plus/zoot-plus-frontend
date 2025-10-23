import { Callout, Icon, NonIdealState } from '@blueprintjs/core'
import {
  Active,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  Over,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { compact, uniq, uniqueId } from 'lodash-es'
import { FC, useEffect, useMemo, useState } from 'react'
import {
  Control,
  UseFieldArrayMove,
  useFieldArray,
  useWatch,
} from 'react-hook-form'
import { SetRequired } from 'type-fest'

import { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FactItem } from '../../FactItem'
import { Droppable, Sortable } from '../../dnd'
import { EditorGroupItem } from './EditorGroupItem'
import { EditorOperatorItem } from './EditorOperatorItem'
import {
  EditorPerformerAdd,
  EditorPerformerAddProps,
  PerformerType,
} from './EditorPerformerAdd'
import { EditorSheetTrigger } from './EditorSheet'

export interface EditorPerformerProps {
  control: Control<CopilotDocV1.Operation>
}

type Operator = CopilotDocV1.Operator
type Group = CopilotDocV1.Group

const nonGroupedContainerId = 'nonGrouped'

const getId = (performer: Operator | Group) => {
  // normally the id will never be undefined, but we need to make TS happy as well as handing edge cases
  return (performer._id ??= uniqueId())
}

export const EditorPerformer: FC<EditorPerformerProps> = ({ control }) => {
  const t = useTranslation()

  const [editMode, setEditMode] = useState<PerformerType>('operator')
  const sensors = useSensors(useSensor(PointerSensor))
  const actions = useWatch({ control, name: 'actions' })

  const {
    fields: _operators,
    append: appendOperator,
    move: moveOperator,
    update: updateOperator,
    remove: removeOperator,
  } = useFieldArray({
    name: 'opers',
    control,
  })

  const {
    fields: _groups,
    append: appendGroup,
    move: moveGroup,
    update: updateGroup,
    remove: removeGroup,
  } = useFieldArray({
    name: 'groups',
    control,
  })

  // upcast them to the base types to stop TS from complaining when calling indexOf(), includes(), etc.
  const operators: Operator[] = _operators
  const groups: Group[] = _groups

  const additionalOperatorsFromActions = useMemo(() => {
    if (!Array.isArray(actions)) return []

    const additionalOperators = actions.map((action) => {
      if (
        'name' in action &&
        !operators.some(({ name }) => name === action.name) &&
        !groups.some(({ opers }) =>
          opers?.some(({ name }) => name === action.name),
        )
      ) {
        return action.name
      }
      return undefined
    })

    return uniq(compact(additionalOperators))
  }, [actions, operators, groups])

  const [draggingOperator, setDraggingOperator] = useState<Operator>()
  const [draggingGroup, setDraggingGroup] = useState<Group>()
  const [editingOperator, setEditingOperator] = useState<Operator>()
  const [editingGroup, setEditingGroup] = useState<Group>()

  const isOperatorEditing = (operator: Operator) =>
    !!editingOperator && getId(editingOperator) === getId(operator)
  const isGroupEditing = (group: Group) =>
    !!editingGroup && getId(editingGroup) === getId(group)

  useEffect(() => {
    if (editingOperator) {
      setEditMode('operator')
      setEditingGroup(undefined)
    }
  }, [editingOperator])

  useEffect(() => {
    if (editingGroup) {
      setEditMode('group')
      setEditingOperator(undefined)
    }
  }, [editingGroup])

  useEffect(() => {
    if (editMode === 'operator') {
      setEditingGroup(undefined)
    } else {
      setEditingOperator(undefined)
    }
  }, [editMode])

  const findOperatorById = (id?: UniqueIdentifier) =>
    // find operator from operators
    operators.find((op) => getId(op) === id) ||
    // find operator from inside groups
    groups
      .map(({ opers }) => opers)
      .flat()
      .find((op) => op && getId(op) === id)

  const findGroupById = (id?: UniqueIdentifier) =>
    groups.find((group) => getId(group) === id)

  const findGroupByOperator = (operator?: Operator) =>
    operator &&
    (groups.find((group) => group.opers?.includes(operator)) as
      | SetRequired<Group, 'opers'>
      | undefined)

  const getType = (item: Active | Over) =>
    item.data.current?.type as 'operator' | 'group'

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (getType(active) === 'operator') {
      setDraggingOperator(findOperatorById(active.id))
    } else {
      setDraggingGroup(findGroupById(active.id))
    }
  }

  const handleDragOver = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    // move operator between groups, or make it non-grouped
    if (getType(active) === 'operator') {
      const operator = findOperatorById(active.id)

      if (operator) {
        const oldGroup = findGroupByOperator(operator)
        const newGroup =
          getType(over) === 'group'
            ? findGroupById(over.id)
            : findGroupByOperator(findOperatorById(over.id))

        if (oldGroup !== newGroup) {
          if (oldGroup) {
            updateGroup(groups.indexOf(oldGroup), {
              ...oldGroup,
              opers: oldGroup.opers?.filter((op) => op !== operator),
            })
          } else {
            removeOperator(operators.indexOf(operator))
          }

          if (newGroup) {
            updateGroup(groups.indexOf(newGroup), {
              ...newGroup,
              opers: [operator, ...(newGroup.opers || [])],
            })
          } else {
            appendOperator(operator)
          }

          return
        }
      }
    }

    // move operator or group within their own container
    if (getType(active) === getType(over)) {
      const moveItem = <T extends Group | Operator>(
        items: T[],
        move: UseFieldArrayMove,
      ) => {
        const oldIndex = items.findIndex((item) => getId(item) === active.id)
        const newIndex = items.findIndex((item) => getId(item) === over.id)
        if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex)
      }

      if (getType(active) === 'operator') {
        const operator = findOperatorById(active.id)

        if (operator) {
          const group = findGroupByOperator(operator)

          if (group) {
            moveItem(group.opers, (oldIndex, newIndex) => {
              updateGroup(groups.indexOf(group), {
                ...group,
                opers: arrayMove(group.opers, oldIndex, newIndex),
              })
            })
          } else {
            moveItem(operators, moveOperator)
          }
        }
      } else if (getType(active) === 'group') {
        moveItem(groups, moveGroup)
      }
    }
  }

  const handleDragEnd = () => {
    setDraggingOperator(undefined)
    setDraggingGroup(undefined)
  }

  const submitOperator: EditorPerformerAddProps['submitOperator'] = (
    { groupName, ...operator },
    setError,
    fromSheet,
  ) => {
    if (
      operators.find(
        ({ name, _id }) => name === operator.name && _id !== operator._id,
      )
    ) {
      setError?.('name', {
        message:
          t.components.editor.operator.EditorPerformer.operator_already_exists,
      })
      return false
    }

    let newGroup: Group | undefined
    let newGroupIndex = -1

    if (groupName) {
      newGroupIndex = groups.findIndex((group) => group.name === groupName)
      newGroup = groups[newGroupIndex]

      if (!newGroup) {
        newGroup = { name: groupName }
        newGroupIndex = groups.length
        submitGroup(newGroup, setError)
      }
    }

    const addOperator = () => {
      if (newGroup) {
        updateGroup(newGroupIndex, {
          ...newGroup,
          opers: [...(newGroup.opers || []), operator],
        })
      } else appendOperator(operator)
    }

    if ((fromSheet && operator._id) || editingOperator) {
      const existingOperator = fromSheet
        ? operator
        : findOperatorById(getId(editingOperator!))
      if (existingOperator) {
        operator._id = getId(existingOperator)

        const oldGroup = findGroupByOperator(existingOperator)
        if (oldGroup) {
          if (oldGroup === newGroup) {
            // replace existing operator in group
            updateGroup(groups.indexOf(oldGroup), {
              ...oldGroup,
              opers: oldGroup.opers.map((op) =>
                op === existingOperator ? operator : op,
              ),
            })
          } else {
            // remove existing operator from group
            updateGroup(groups.indexOf(oldGroup), {
              ...oldGroup,
              opers: oldGroup.opers.filter((op) => op !== existingOperator),
            })

            // add new operator to group
            addOperator()
          }
        } else {
          if (newGroup) {
            removeOperator(operators.indexOf(existingOperator))
            addOperator()
          } else {
            updateOperator(
              operators.findIndex(({ _id }) => _id === operator._id),
              operator,
            )
          }
        }

        setEditingOperator(undefined)
      } else {
        setError?.('global' as any, {
          message:
            t.components.editor.operator.EditorPerformer
              .update_operator_not_found,
        })
        return false
      }
    } else {
      operator._id = uniqueId()
      addOperator()
    }
    return true
  }

  const submitGroup: EditorPerformerAddProps['submitGroup'] = (
    group,
    setError,
    fromSheet,
  ) => {
    if (
      groups.find(({ name, _id }) => name === group.name && _id !== group._id)
    ) {
      setError?.('name', {
        message:
          t.components.editor.operator.EditorPerformer.group_already_exists,
      })
      return false
    }
    if (editingGroup || (fromSheet && group._id)) {
      const existingGroup = fromSheet
        ? group
        : findGroupById(getId(editingGroup!))
      if (existingGroup) {
        group._id = getId(existingGroup)
        updateGroup(
          groups.findIndex(({ _id }) => _id === existingGroup._id),
          group,
        )
        setEditingGroup(undefined)
      } else {
        setError?.('global' as any, {
          message:
            t.components.editor.operator.EditorPerformer.update_group_not_found,
        })
        return false
      }
    } else {
      group._id = uniqueId()
      appendGroup(group)
      if (group.opers?.length) {
        removeOperator(
          group.opers
            ?.map((item) =>
              operators.findIndex(({ name }) => name === item.name),
            )
            .filter((item) => item !== -1),
        )
      }
    }

    return true
  }

  return (
    <>
      <div className="flex flex-wrap md:flex-nowrap">
        <div className="w-full md:w-1/3 md:mr-8 flex flex-col pb-8">
          <div className="mb-2">
            <EditorSheetTrigger
              submitOperator={submitOperator}
              submitGroup={submitGroup}
              existedOperators={operators}
              existedGroups={groups}
              removeOperator={removeOperator}
              removeGroup={removeGroup}
            />
          </div>
          <EditorPerformerAdd
            mode={editMode}
            operator={editingOperator}
            group={editingGroup}
            groups={groups}
            onModeChange={setEditMode}
            onCancel={() => {
              setEditingOperator(undefined)
              setEditingGroup(undefined)
            }}
            submitOperator={submitOperator}
            submitGroup={submitGroup}
          />
        </div>
        <div className="w-full md:w-2/3 pb-8">
          {additionalOperatorsFromActions.length > 0 && (
            <Callout
              className="flex items-center py-2 mb-2"
              icon={null}
              intent="primary"
            >
              <Icon icon="info-sign" className="mr-1" />
              {t.components.editor.operator.EditorPerformer.ungrouped_operators}
              : {additionalOperatorsFromActions.join(', ')}
            </Callout>
          )}
          <div className="mt-2 relative">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragEnd}
            >
              <Droppable id={nonGroupedContainerId}>
                <FactItem
                  title={t.components.editor.operator.EditorPerformer.operators}
                  icon="person"
                  className="font-bold"
                />

                {operators.length === 0 && (
                  <NonIdealState
                    title={
                      t.components.editor.operator.EditorPerformer.no_operators
                    }
                  />
                )}

                <SortableContext
                  items={operators.map(getId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-wrap">
                    {operators.map((operator) => (
                      <Sortable
                        className="mt-2 mr-2"
                        key={getId(operator)}
                        id={getId(operator)}
                        data={{ type: 'operator' }}
                      >
                        {(attrs) => (
                          <EditorOperatorItem
                            operator={operator}
                            editing={isOperatorEditing(operator)}
                            onEdit={() =>
                              setEditingOperator(
                                isOperatorEditing(operator)
                                  ? undefined
                                  : operator,
                              )
                            }
                            onRemove={() =>
                              removeOperator(operators.indexOf(operator))
                            }
                            {...attrs}
                          />
                        )}
                      </Sortable>
                    ))}
                  </ul>
                </SortableContext>
              </Droppable>

              <FactItem
                title={
                  t.components.editor.operator.EditorPerformer.operator_groups
                }
                icon="people"
                className="font-bold mt-8"
              />

              {groups.length === 0 && (
                // extra div container: NonIdealState is using height: 100% which causes unexpected overflow
                <div className="relative">
                  <NonIdealState
                    title={
                      t.components.editor.operator.EditorPerformer
                        .no_operator_groups
                    }
                  />
                </div>
              )}

              <SortableContext
                items={groups.map(getId)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-wrap">
                  {groups.map((group) => (
                    <Sortable
                      className="mt-4 mr-4"
                      key={getId(group)}
                      id={getId(group)}
                      data={{ type: 'group' }}
                    >
                      {(attrs) => (
                        <EditorGroupItem
                          group={group}
                          editing={isGroupEditing(group)}
                          onEdit={() =>
                            setEditingGroup(
                              isGroupEditing(group) ? undefined : group,
                            )
                          }
                          onRemove={() => removeGroup(groups.indexOf(group))}
                          getOperatorId={getId}
                          isOperatorEditing={isOperatorEditing}
                          onOperatorEdit={(operator) =>
                            setEditingOperator(
                              isOperatorEditing(operator)
                                ? undefined
                                : operator,
                            )
                          }
                          onOperatorRemove={(operatorIndexInGroup) => {
                            const groupIndex = groups.indexOf(group)
                            if (operatorIndexInGroup > -1) {
                              group.opers?.splice(operatorIndexInGroup, 1)
                            }
                            updateGroup(groupIndex, group)
                          }}
                          {...attrs}
                        />
                      )}
                    </Sortable>
                  ))}
                </ul>
              </SortableContext>

              <DragOverlay>
                {draggingOperator && (
                  <EditorOperatorItem
                    editing={isOperatorEditing(draggingOperator)}
                    operator={draggingOperator}
                  />
                )}
                {draggingGroup && (
                  <EditorGroupItem
                    group={draggingGroup}
                    editing={isGroupEditing(draggingGroup)}
                    isOperatorEditing={isOperatorEditing}
                    getOperatorId={getId}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </>
  )
}
