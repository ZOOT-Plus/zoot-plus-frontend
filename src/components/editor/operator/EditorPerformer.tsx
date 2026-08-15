import { Callout, Icon, NonIdealState } from '@blueprintjs/core'
import {
  Active,
  DndContext,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  Over,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { uniqueId } from 'lodash-es'
import { FC, useEffect, useMemo, useState } from 'react'
import { Control, UseFormGetValues, useFieldArray, useWatch } from 'react-hook-form'

import { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FactItem } from '../../FactItem'
import { Droppable, Sortable, useStableArray } from '../../dnd'
import { EditorGroupItem } from './EditorGroupItem'
import { EditorOperatorItem } from './EditorOperatorItem'
import { EditorPerformerAdd, EditorPerformerAddProps, PerformerType } from './EditorPerformerAdd'
import { EditorSheetTrigger } from './EditorSheet'

export interface EditorPerformerProps {
  control: Control<CopilotDocV1.Operation>
  getValues: UseFormGetValues<CopilotDocV1.Operation>
}

type Operator = CopilotDocV1.Operator
type Group = CopilotDocV1.Group

type OperatorLocation =
  | {
      container: 'opers'
      index: number
      operator: Operator
    }
  | {
      container: 'group'
      groupIndex: number
      operatorIndex: number
      operator: Operator
      group: Group
    }

const nonGroupedContainerId = 'nonGrouped'

const getId = (performer: Operator | Group) => {
  // normally the id will never be undefined, but we need to make TS happy as well as handing edge cases
  return (performer._id ||= uniqueId())
}

const normalizeOperators = (opers?: Operator[]): Operator[] =>
  (opers || [])
    .filter((operator): operator is Operator => !!operator)
    .map((operator) => ({
      ...operator,
      _id: operator._id || uniqueId(),
    }))

const findOperatorLocationIn = (
  operators: Operator[],
  groups: Group[],
  id?: UniqueIdentifier,
): OperatorLocation | undefined => {
  if (id === undefined) return undefined

  const operatorIndex = operators.findIndex((operator) => operator?._id === id)
  if (operatorIndex !== -1) {
    return {
      container: 'opers',
      index: operatorIndex,
      operator: operators[operatorIndex],
    }
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]
    if (!group) continue
    const operatorIndex = group.opers?.findIndex((operator) => !!operator && operator._id === id) ?? -1
    if (operatorIndex !== -1 && group.opers?.[operatorIndex]) {
      return {
        container: 'group',
        groupIndex,
        operatorIndex,
        operator: group.opers[operatorIndex],
        group,
      }
    }
  }

  return undefined
}

const findGroupByIdIn = (groups: Group[], id?: UniqueIdentifier) => groups.find((group) => !!group && group._id === id)

interface AdditionalOperatorsFromActionsProps {
  control: Control<CopilotDocV1.Operation>
  operators: Operator[]
  groups: Group[]
}

/**
 * Isolated so that editing any action only re-renders this callout instead of the whole performer panel.
 */
const AdditionalOperatorsFromActions: FC<AdditionalOperatorsFromActionsProps> = ({ control, operators, groups }) => {
  const t = useTranslation()
  const actions = useWatch({ control, name: 'actions' })

  const additionalOperatorsFromActions = useMemo(() => {
    if (!actions) return []

    const knownOperatorNames = new Set<string>()
    for (const operator of operators) {
      knownOperatorNames.add(operator.name)
    }
    for (const group of groups) {
      for (const operator of group.opers || []) {
        if (operator) knownOperatorNames.add(operator.name)
      }
    }

    const additionalOperators = new Set<string>()
    for (const action of actions) {
      if (action && 'name' in action && action.name && !knownOperatorNames.has(action.name)) {
        additionalOperators.add(action.name)
      }
    }
    return [...additionalOperators]
  }, [actions, operators, groups])

  if (additionalOperatorsFromActions.length === 0) {
    return null
  }

  return (
    <Callout className="flex items-center py-2 mb-2" icon={null} intent="primary">
      <Icon icon="info-sign" className="mr-1" />
      {t.components.editor.operator.EditorPerformer.ungrouped_operators}: {additionalOperatorsFromActions.join(', ')}
    </Callout>
  )
}

export const EditorPerformer: FC<EditorPerformerProps> = ({ control, getValues }) => {
  const t = useTranslation()

  const [editMode, setEditMode] = useState<PerformerType>('operator')
  const sensors = useSensors(useSensor(PointerSensor))

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

  // useFieldArray returns fresh wrapper objects on every render. Keep stable snapshots
  // so memoized children and sortable item arrays are not invalidated by unrelated re-renders.
  const operators: Operator[] = useStableArray(_operators)
  const groups: Group[] = useStableArray(_groups)
  const operatorIds = useStableArray(operators.map(getId))
  const groupIds = useStableArray(groups.map(getId))

  const [draggingOperator, setDraggingOperator] = useState<Operator>()
  const [draggingGroup, setDraggingGroup] = useState<Group>()
  const [editingOperator, setEditingOperator] = useState<Operator>()
  const [editingGroup, setEditingGroup] = useState<Group>()

  const isOperatorEditing = (operator: Operator) => !!editingOperator && getId(editingOperator) === getId(operator)
  const isGroupEditing = (group: Group) => !!editingGroup && getId(editingGroup) === getId(group)

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

  const findGroupById = (id?: UniqueIdentifier) => groups.find((group) => getId(group) === id)

  const getType = (item: Active | Over) => item.data.current?.type as 'operator' | 'group' | undefined

  const removeOperatorFromLocation = (
    location: OperatorLocation,
    currentOperators: Operator[] = operators,
    currentGroups: Group[] = groups,
  ) => {
    if (location.container === 'opers') {
      const index = currentOperators.findIndex((operator) => operator?._id === getId(location.operator))
      if (index !== -1) {
        removeOperator(index)
      }
      return
    }

    const group = currentGroups[location.groupIndex]
    if (group) {
      updateGroup(location.groupIndex, {
        ...group,
        opers: group.opers?.filter((_, index) => index !== location.operatorIndex),
      })
    }
  }

  const addOperatorToGroup = (groupIndex: number, operator: Operator, currentGroups: Group[] = groups) => {
    const group = currentGroups[groupIndex]
    if (!group) return

    updateGroup(groupIndex, {
      ...group,
      opers: [...normalizeOperators(group.opers), operator],
    })
  }

  const moveOperatorToTop = (
    location: OperatorLocation,
    currentOperators: Operator[] = operators,
    currentGroups: Group[] = groups,
  ) => {
    if (location.container !== 'group') return

    const group = currentGroups[location.groupIndex]
    updateGroup(location.groupIndex, {
      ...group,
      opers: group.opers?.filter((_, index) => index !== location.operatorIndex),
    })

    const alreadyAtTop = currentOperators.some((operator) => operator?._id === getId(location.operator))
    if (!alreadyAtTop) {
      appendOperator(location.operator)
    }
  }

  const moveOperatorToGroup = (
    location: OperatorLocation,
    targetGroupIndex: number,
    currentOperators: Operator[] = operators,
    currentGroups: Group[] = groups,
  ) => {
    if (location.container === 'group' && location.groupIndex === targetGroupIndex) {
      return
    }

    const targetGroup = currentGroups[targetGroupIndex]
    if (!targetGroup) return

    removeOperatorFromLocation(location, currentOperators, currentGroups)

    const alreadyInTargetGroup = targetGroup.opers?.some(
      (operator) => !!operator && operator._id === getId(location.operator),
    )
    if (!alreadyInTargetGroup) {
      updateGroup(targetGroupIndex, {
        ...targetGroup,
        opers: [location.operator, ...normalizeOperators(targetGroup.opers)],
      })
    }
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    const currentOperators = getValues('opers') || []
    const currentGroups = getValues('groups') || []
    if (getType(active) === 'operator') {
      setDraggingOperator(findOperatorLocationIn(currentOperators, currentGroups, active.id)?.operator)
    } else {
      setDraggingGroup(findGroupByIdIn(currentGroups, active.id))
    }
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    // Always re-read the current RHF values here. dnd-kit may fire many drag-over
    // events before React commits the previous field-array update.
    const currentOperators = getValues('opers') || []
    const currentGroups = getValues('groups') || []

    const activeType = getType(active)
    const overType = getType(over)

    if (activeType === 'group') {
      if (overType === 'group') {
        const oldIndex = currentGroups.findIndex((group) => group?._id === active.id)
        const newIndex = currentGroups.findIndex((group) => group?._id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          moveGroup(oldIndex, newIndex)
        }
      }
      return
    }

    if (activeType !== 'operator') {
      return
    }

    const location = findOperatorLocationIn(currentOperators, currentGroups, active.id)
    if (!location) return

    if (overType === 'group') {
      const targetGroupIndex = currentGroups.findIndex((group) => group?._id === over.id)
      if (targetGroupIndex !== -1) {
        moveOperatorToGroup(location, targetGroupIndex, currentOperators, currentGroups)
      }
      return
    }

    if (overType === 'operator') {
      const overLocation = findOperatorLocationIn(currentOperators, currentGroups, over.id)
      if (!overLocation) return

      if (location.container === 'opers' && overLocation.container === 'opers') {
        if (location.index !== overLocation.index) {
          moveOperator(location.index, overLocation.index)
        }
        return
      }

      if (location.container === 'group' && overLocation.container === 'group') {
        if (location.groupIndex === overLocation.groupIndex) {
          if (location.operatorIndex !== overLocation.operatorIndex) {
            const group = currentGroups[location.groupIndex]
            updateGroup(location.groupIndex, {
              ...group,
              opers: arrayMove(group.opers || [], location.operatorIndex, overLocation.operatorIndex),
            })
          }
        } else {
          moveOperatorToGroup(location, overLocation.groupIndex, currentOperators, currentGroups)
        }
        return
      }

      if (location.container === 'group' && overLocation.container === 'opers') {
        moveOperatorToTop(location, currentOperators, currentGroups)
      } else if (location.container === 'opers' && overLocation.container === 'group') {
        moveOperatorToGroup(location, overLocation.groupIndex, currentOperators, currentGroups)
      }
      return
    }

    // Dropping on the non-grouped droppable container.
    if (over.id === nonGroupedContainerId) {
      moveOperatorToTop(location, currentOperators, currentGroups)
    }
  }

  const handleDragEnd = () => {
    setDraggingOperator(undefined)
    setDraggingGroup(undefined)
  }

  const isOperatorNameTaken = (
    name: string,
    excludedId?: string,
    currentOperators: Operator[] = operators,
    currentGroups: Group[] = groups,
  ) =>
    currentOperators.some((operator) => operator?.name === name && getId(operator) !== excludedId) ||
    currentGroups.some((group) =>
      group?.opers?.some((operator) => operator?.name === name && getId(operator) !== excludedId),
    )

  const isGroupNameTaken = (name: string, excludedId?: string, currentGroups: Group[] = groups) =>
    currentGroups.some((group) => group?.name === name && getId(group) !== excludedId)

  const submitOperator: EditorPerformerAddProps['submitOperator'] = (
    { groupName, ...operator },
    setError,
    fromSheet,
  ) => {
    const currentOperators = getValues('opers') || []
    const currentGroups = getValues('groups') || []
    const submittedId = operator._id ? getId(operator) : undefined

    if (isOperatorNameTaken(operator.name, submittedId, currentOperators, currentGroups)) {
      setError?.('name', {
        message: t.components.editor.operator.EditorPerformer.operator_already_exists,
      })
      return false
    }

    const existingId = fromSheet && submittedId ? submittedId : editingOperator ? getId(editingOperator) : undefined
    const targetGroupIndex = groupName ? currentGroups.findIndex((group) => group?.name === groupName) : -1

    if (existingId) {
      const location = findOperatorLocationIn(currentOperators, currentGroups, existingId)
      if (!location) {
        setError?.('global' as any, {
          message: t.components.editor.operator.EditorPerformer.update_operator_not_found,
        })
        return false
      }

      operator._id = existingId

      if (groupName && targetGroupIndex === -1) {
        // Move to a group that is created together with this submission.
        removeOperatorFromLocation(location, currentOperators, currentGroups)
        appendGroup({
          _id: uniqueId(),
          name: groupName,
          opers: [operator],
        })
      } else if (targetGroupIndex !== -1) {
        if (location.container === 'group' && location.groupIndex === targetGroupIndex) {
          const group = currentGroups[targetGroupIndex]
          updateGroup(targetGroupIndex, {
            ...group,
            opers: group.opers?.map((groupOperator, index) =>
              index === location.operatorIndex ? operator : groupOperator,
            ),
          })
        } else {
          removeOperatorFromLocation(location, currentOperators, currentGroups)
          addOperatorToGroup(targetGroupIndex, operator, currentGroups)
        }
      } else if (location.container === 'group') {
        removeOperatorFromLocation(location, currentOperators, currentGroups)
        const topLevelIndex = currentOperators.findIndex((topLevelOperator) => topLevelOperator?._id === existingId)
        if (topLevelIndex !== -1) {
          updateOperator(topLevelIndex, operator)
        } else {
          appendOperator(operator)
        }
      } else {
        updateOperator(location.index, operator)
      }

      setEditingOperator(undefined)
    } else {
      operator._id = uniqueId()

      if (groupName && targetGroupIndex === -1) {
        appendGroup({
          _id: uniqueId(),
          name: groupName,
          opers: [operator],
        })
      } else if (targetGroupIndex !== -1) {
        addOperatorToGroup(targetGroupIndex, operator, currentGroups)
      } else {
        appendOperator(operator)
      }
    }

    return true
  }

  const submitGroup: EditorPerformerAddProps['submitGroup'] = (group, setError, fromSheet) => {
    const currentGroups = getValues('groups') || []
    const submittedId = group._id ? getId(group) : undefined

    if (isGroupNameTaken(group.name, submittedId, currentGroups)) {
      setError?.('name', {
        message: t.components.editor.operator.EditorPerformer.group_already_exists,
      })
      return false
    }

    if (editingGroup || (fromSheet && group._id)) {
      const existingGroup = fromSheet ? group : findGroupById(getId(editingGroup!))
      if (existingGroup) {
        const groupIndex = currentGroups.findIndex((item) => item?._id === getId(existingGroup))
        if (groupIndex === -1) {
          setError?.('global' as any, {
            message: t.components.editor.operator.EditorPerformer.update_group_not_found,
          })
          return false
        }

        updateGroup(groupIndex, {
          ...group,
          _id: getId(existingGroup),
          opers: normalizeOperators(group.opers),
        })
        setEditingGroup(undefined)
      } else {
        setError?.('global' as any, {
          message: t.components.editor.operator.EditorPerformer.update_group_not_found,
        })
        return false
      }
    } else {
      const currentOperators = getValues('opers') || []
      const opers = normalizeOperators(group.opers)
      appendGroup({
        ...group,
        _id: uniqueId(),
        opers,
      })

      if (opers.length) {
        const operatorIds = new Set(opers.map(getId))
        const topLevelIndices = currentOperators.flatMap((operator, index) =>
          operator && operatorIds.has(getId(operator)) ? [index] : [],
        )
        if (topLevelIndices.length) {
          removeOperator(topLevelIndices)
        }
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
          <AdditionalOperatorsFromActions control={control} operators={operators} groups={groups} />
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
                  <NonIdealState title={t.components.editor.operator.EditorPerformer.no_operators} />
                )}

                <SortableContext items={operatorIds} strategy={verticalListSortingStrategy}>
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
                            onEdit={() => setEditingOperator(isOperatorEditing(operator) ? undefined : operator)}
                            onRemove={() => {
                              const currentOperators = getValues('opers') || []
                              const currentIndex = currentOperators.findIndex((item) => item?._id === getId(operator))
                              if (currentIndex !== -1) {
                                removeOperator(currentIndex)
                              }
                            }}
                            {...attrs}
                          />
                        )}
                      </Sortable>
                    ))}
                  </ul>
                </SortableContext>
              </Droppable>

              <FactItem
                title={t.components.editor.operator.EditorPerformer.operator_groups}
                icon="people"
                className="font-bold mt-8"
              />

              {groups.length === 0 && (
                // extra div container: NonIdealState is using height: 100% which causes unexpected overflow
                <div className="relative">
                  <NonIdealState title={t.components.editor.operator.EditorPerformer.no_operator_groups} />
                </div>
              )}

              <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-wrap">
                  {groups.map((group) => (
                    <Sortable className="mt-4 mr-4" key={getId(group)} id={getId(group)} data={{ type: 'group' }}>
                      {(attrs) => (
                        <EditorGroupItem
                          group={group}
                          editing={isGroupEditing(group)}
                          onEdit={() => setEditingGroup(isGroupEditing(group) ? undefined : group)}
                          onRemove={() => {
                            const groupIndex = groups.findIndex((item) => getId(item) === getId(group))
                            if (groupIndex !== -1) {
                              removeGroup(groupIndex)
                            }
                          }}
                          getOperatorId={getId}
                          isOperatorEditing={isOperatorEditing}
                          onOperatorEdit={(operator) =>
                            setEditingOperator(isOperatorEditing(operator) ? undefined : operator)
                          }
                          onOperatorRemove={(operatorIndexInGroup, operator) => {
                            const currentGroups = getValues('groups') || []
                            const groupIndex = currentGroups.findIndex((item) => item?._id === getId(group))
                            if (groupIndex === -1) return

                            const currentGroup = currentGroups[groupIndex]
                            const currentOperatorIndex =
                              currentGroup?.opers?.findIndex((item) => item?._id === getId(operator)) ?? -1
                            const removeIndex =
                              currentOperatorIndex !== -1 ? currentOperatorIndex : operatorIndexInGroup
                            if (removeIndex < 0) return

                            updateGroup(groupIndex, {
                              ...currentGroup,
                              opers: currentGroup.opers?.filter((_, index) => index !== removeIndex),
                            })
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
                  <EditorOperatorItem editing={isOperatorEditing(draggingOperator)} operator={draggingOperator} />
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
