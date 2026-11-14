import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  FormGroup,
  Icon,
  InputGroup,
  MenuItem,
  NonIdealState,
} from '@blueprintjs/core'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAtomValue } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { FC, useState } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { Suggest } from '../../Suggest'
import { Droppable, Sortable } from '../../dnd'
import { EditorGroup, EditorOperator, editorAtoms, useEdit } from '../core/editor-state'
import { createGroup } from '../core/models/group'
import { createOperator, globalOperatorContainerId, useOperatorDragEnd } from '../core/models/operator'
import { DetailedSelect, DetailedSelectChoice } from './DetailedSelect'
import { LegacyFormGroup } from './LegacyFormGroup'
import { LegacyNumericInput } from './LegacyNumericInput'
import { LegacyOperatorName } from './LegacyOperatorName'
import { LegacyGroupCard, LegacyOperatorCard } from './LegacyPerformerCards'
import { LegacyQuickEditDrawer } from './LegacyQuickEditDrawer'
import { LegacySkillUsageSelect } from './LegacySkillUsageSelect'

type PerformerMode = 'operator' | 'group'

export const LegacyPerformerEditor: FC = () => {
  const t = useTranslation()
  const [operation, setOperation] = useImmerAtom(editorAtoms.operation)
  const edit = useEdit()
  const [mode, setMode] = useState<PerformerMode>('operator')
  const [editingOperatorId, setEditingOperatorId] = useState<string>()
  const [editingGroupId, setEditingGroupId] = useState<string>()
  const [operatorName, setOperatorName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupMembership, setGroupMembership] = useState('')
  const [skill, setSkill] = useState(0)
  const [skillUsage, setSkillUsage] = useState<CopilotDocV1.SkillUsageType>(CopilotDocV1.SkillUsageType.None)
  const [skillTimes, setSkillTimes] = useState(1)
  const [error, setError] = useState('')
  const [draggingOperator, setDraggingOperator] = useState<EditorOperator>()
  const [draggingGroup, setDraggingGroup] = useState<EditorGroup>()
  const groups = useAtomValue(editorAtoms.groups)
  const actions = useAtomValue(editorAtoms.actions)
  const operatorIds = operation.opers.map(({ id }) => id)
  const groupIds = groups.map(({ id }) => id)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )
  const moveOperator = useOperatorDragEnd()
  const knownOperatorNames = new Set([
    ...operation.opers.map(({ name }) => name),
    ...groups.flatMap((group) => group.opers.map(({ name }) => name)),
  ])
  const additionalOperatorNames = [
    ...new Set(actions.flatMap((action) => ('name' in action && action.name ? [action.name] : []))),
  ].filter((name) => !knownOperatorNames.has(name))
  const skillItems: DetailedSelectChoice[] = [0, 1, 2, 3].map((value) => ({
    type: 'choice',
    icon: 'cog',
    title: t.components.editor.operator.EditorOperatorSkill.skill_number({ count: value }),
    value,
  }))

  const resetForm = () => {
    setEditingOperatorId(undefined)
    setEditingGroupId(undefined)
    setOperatorName('')
    setGroupName('')
    setGroupMembership('')
    setSkill(0)
    setSkillUsage(CopilotDocV1.SkillUsageType.None)
    setSkillTimes(1)
    setError('')
  }

  const editOperator = (operator: EditorOperator) => {
    setMode('operator')
    setEditingOperatorId(operator.id)
    setEditingGroupId(undefined)
    setOperatorName(operator.name)
    setGroupMembership(groups.find((group) => group.opers.some((item) => item.id === operator.id))?.name || '')
    setSkill(operator.skill ?? 0)
    setSkillUsage(operator.skillUsage ?? CopilotDocV1.SkillUsageType.None)
    setSkillTimes(operator.skillTimes ?? 1)
    setError('')
  }

  const editGroup = (group: EditorGroup) => {
    setMode('group')
    setEditingGroupId(group.id)
    setEditingOperatorId(undefined)
    setGroupName(group.name)
    setError('')
  }

  const submitOperator = () => {
    const trimmedName = operatorName.trim()
    const trimmedGroupName = groupMembership.trim()
    if (!trimmedName) {
      setError(t.components.editor.operator.EditorPerformerOperator.operator_name)
      return
    }
    const duplicate = [...operation.opers, ...groups.flatMap((group) => group.opers)].some(
      (operator) => operator.name === trimmedName && operator.id !== editingOperatorId,
    )
    if (duplicate) {
      setError(t.components.editor.operator.EditorPerformer.operator_already_exists)
      return
    }

    edit(() => {
      setOperation((draft) => {
        let operator: EditorOperator
        if (editingOperatorId) {
          const topLevelIndex = draft.opers.findIndex((item) => item.id === editingOperatorId)
          const owner = draft.groups.find((group) => group.opers.some((item) => item.id === editingOperatorId))
          const existing =
            topLevelIndex >= 0 ? draft.opers[topLevelIndex] : owner?.opers.find((item) => item.id === editingOperatorId)
          if (!existing) return
          operator = {
            ...existing,
            name: trimmedName,
            skill: skill || 1,
            skillUsage,
            skillTimes: skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes ? skillTimes : undefined,
          }
          if (topLevelIndex >= 0) draft.opers.splice(topLevelIndex, 1)
          if (owner) owner.opers = owner.opers.filter((item) => item.id !== editingOperatorId)
        } else {
          operator = createOperator({
            name: trimmedName,
            skill: skill || 1,
            skillUsage,
            skillTimes: skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes ? skillTimes : undefined,
          })
        }

        if (trimmedGroupName) {
          let target = draft.groups.find((group) => group.name === trimmedGroupName)
          if (!target) {
            target = createGroup({ name: trimmedGroupName })
            draft.groups.push(target)
          }
          target.opers.push(operator)
        } else {
          draft.opers.push(operator)
        }
      })
      return {
        action: editingOperatorId ? 'update-operator' : 'add-operator',
        desc: editingOperatorId ? i18n.actions.editor2.update_operator : i18n.actions.editor2.add_operator,
      }
    })
    resetForm()
  }

  const submitGroup = () => {
    const trimmedName = groupName.trim()
    if (!trimmedName) {
      setError(t.components.editor.operator.EditorPerformerGroup.group_name)
      return
    }
    if (groups.some((group) => group.name === trimmedName && group.id !== editingGroupId)) {
      setError(t.components.editor.operator.EditorPerformer.group_already_exists)
      return
    }
    edit(() => {
      setOperation((draft) => {
        const group = draft.groups.find((item) => item.id === editingGroupId)
        if (group) group.name = trimmedName
        else draft.groups.push(createGroup({ name: trimmedName }))
      })
      return {
        action: editingGroupId ? 'update-group' : 'add-group',
        desc: editingGroupId ? i18n.actions.editor2.update_group : i18n.actions.editor2.add_group,
      }
    })
    resetForm()
  }

  const clearDragPreview = () => {
    setDraggingOperator(undefined)
    setDraggingGroup(undefined)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'group') {
      setDraggingGroup(groups.find((group) => group.id === active.id))
      setDraggingOperator(undefined)
      return
    }
    const operator =
      operation.opers.find((item) => item.id === active.id) ||
      groups.flatMap((group) => group.opers).find((item) => item.id === active.id)
    setDraggingOperator(operator)
    setDraggingGroup(undefined)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.active.data.current?.type === 'group' && event.over?.data.current?.type === 'group') {
      const from = groups.findIndex((group) => group.id === event.active.id)
      const to = groups.findIndex((group) => group.id === event.over?.id)
      if (from !== -1 && to !== -1 && from !== to) {
        edit(() => {
          setOperation((draft) => {
            draft.groups = arrayMove(draft.groups, from, to)
          })
          return { action: 'move-group', desc: i18n.actions.editor2.move_group }
        })
      }
      clearDragPreview()
      return
    }
    moveOperator(event)
    clearDragPreview()
  }

  const removeOperator = (id: string) => {
    edit(() => {
      setOperation((draft) => {
        draft.opers = draft.opers.filter((operator) => operator.id !== id)
        for (const group of draft.groups) group.opers = group.opers.filter((operator) => operator.id !== id)
      })
      return { action: 'remove-operator', desc: i18n.actions.editor2.delete_operator }
    })
    if (editingOperatorId === id) resetForm()
  }

  const removeGroup = (id: string) => {
    edit(() => {
      setOperation((draft) => {
        draft.groups = draft.groups.filter((group) => group.id !== id)
      })
      return { action: 'remove-group', desc: i18n.actions.editor2.delete_group }
    })
    if (editingGroupId === id) resetForm()
  }

  return (
    <>
      <section className="px-8 pb-4">
        <h3 className="mb-2 text-lg font-bold">{t.components.editor.OperationEditor.operators_and_groups}</h3>
      </section>
      <div className="flex flex-wrap md:flex-nowrap px-8">
        <div className="w-full md:w-1/3 md:mr-8 flex flex-col pb-8">
          <LegacyQuickEditDrawer />
          <Card className="mb-8 pt-4">
            <div className="flex items-center mb-4">
              <ButtonGroup>
                <Button
                  active={mode === 'operator'}
                  onClick={() => {
                    setMode('operator')
                    resetForm()
                  }}
                >
                  {t.components.editor.operator.EditorPerformerAdd.operator}
                </Button>
                <Button
                  active={mode === 'group'}
                  onClick={() => {
                    setMode('group')
                    resetForm()
                  }}
                >
                  {t.components.editor.operator.EditorPerformerAdd.operator_group}
                </Button>
              </ButtonGroup>
              <div className="flex-1" />
              {(editingOperatorId || editingGroupId) && (
                <Button minimal icon="reset" intent="danger" onClick={resetForm}>
                  {t.components.editor.EditorResetButton.reset}
                </Button>
              )}
            </div>
            {mode === 'operator' ? (
              <>
                <LegacyFormGroup
                  label={t.components.editor.operator.EditorPerformerOperator.operator_name}
                  description={t.components.editor.operator.EditorPerformerOperator.operator_description}
                  helperText={t.components.editor.operator.EditorPerformerOperator.search_hint}
                >
                  <LegacyOperatorName value={operatorName} onChange={setOperatorName} />
                </LegacyFormGroup>
                <LegacyFormGroup
                  label={t.components.editor.operator.EditorPerformerOperator.group_membership}
                  description={t.components.editor.operator.EditorPerformerOperator.group_membership_description}
                >
                  <Suggest<{ id: string; name: string }>
                    items={groups.map(({ id, name }) => ({ id, name }))}
                    itemListPredicate={(query) =>
                      query
                        ? groups.filter((group) => group.name.includes(query)).map(({ id, name }) => ({ id, name }))
                        : groups.map(({ id, name }) => ({ id, name }))
                    }
                    onReset={() => setGroupMembership('')}
                    itemRenderer={(group, { handleClick, handleFocus, modifiers }) => (
                      <MenuItem
                        key={group.id}
                        text={group.name}
                        onClick={handleClick}
                        onFocus={handleFocus}
                        selected={modifiers.active}
                        disabled={modifiers.disabled}
                      />
                    )}
                    onItemSelect={(group) => setGroupMembership(group.name)}
                    selectedItem={groupMembership ? { id: `selected-${groupMembership}`, name: groupMembership } : null}
                    inputValueRenderer={(group) => group.name}
                    createNewItemFromQuery={(query) => ({ id: `new-${query}`, name: query })}
                    createNewItemRenderer={(query, active, handleClick) => (
                      <MenuItem
                        key="create-new-group"
                        text={t.components.editor.operator.EditorOperatorGroupSelect.create_new_group({ query })}
                        icon="text-highlight"
                        onClick={handleClick}
                        selected={active}
                      />
                    )}
                    noResults={
                      <MenuItem
                        disabled
                        text={t.components.editor.operator.EditorOperatorGroupSelect.no_matching_groups}
                      />
                    }
                    inputProps={{
                      large: true,
                      placeholder: t.components.editor.operator.EditorOperatorGroupSelect.group_name,
                    }}
                  />
                </LegacyFormGroup>
                <div className="flex flex-wrap gap-2">
                  <FormGroup label={t.components.editor.operator.EditorPerformerOperator.skill}>
                    <DetailedSelect
                      items={skillItems}
                      value={skill}
                      onItemSelect={(item) => setSkill(Number(item.value))}
                    >
                      <Button
                        icon="cog"
                        text={t.components.editor.operator.EditorOperatorSkill.skill_number({ count: skill })}
                        rightIcon="double-caret-vertical"
                      />
                    </DetailedSelect>
                  </FormGroup>
                  <FormGroup label={t.components.editor.operator.EditorPerformerOperator.skill_usage}>
                    <LegacySkillUsageSelect value={skillUsage} onChange={setSkillUsage} />
                  </FormGroup>
                  {skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes && (
                    <FormGroup label={t.components.editor.operator.EditorPerformerOperator.skill_usage_count}>
                      <LegacyNumericInput intOnly min={1} value={skillTimes} onValueChange={setSkillTimes} />
                    </FormGroup>
                  )}
                </div>
                <div className="pb-4 flex gap-2">
                  <Button intent="primary" icon={editingOperatorId ? 'edit' : 'add'} onClick={submitOperator}>
                    {editingOperatorId
                      ? t.components.editor.operator.EditorPerformerOperator.save
                      : t.components.editor.operator.EditorPerformerOperator.add}
                  </Button>
                  {editingOperatorId && (
                    <Button icon="cross" onClick={resetForm}>
                      {t.components.editor.operator.EditorPerformerOperator.cancel_edit}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Callout className="mx-4 mb-4">
                  <div className="font-bold mb-1">
                    {t.components.editor.operator.EditorPerformerGroup.what_is_group}
                  </div>
                  <div>{t.components.editor.operator.EditorPerformerGroup.group_explanation}</div>
                </Callout>
                <LegacyFormGroup
                  label={t.components.editor.operator.EditorPerformerGroup.group_name}
                  description={t.components.editor.operator.EditorPerformerGroup.name_description}
                >
                  <InputGroup
                    large
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder={t.components.editor.operator.EditorPerformerGroup.name_placeholder}
                  />
                </LegacyFormGroup>
                <div className="pb-4 flex gap-2">
                  <Button intent="primary" icon={editingGroupId ? 'edit' : 'add'} onClick={submitGroup}>
                    {editingGroupId
                      ? t.components.editor.operator.EditorPerformerGroup.save
                      : t.components.editor.operator.EditorPerformerGroup.add}
                  </Button>
                  {editingGroupId && (
                    <Button icon="cross" onClick={resetForm}>
                      {t.components.editor.operator.EditorPerformerGroup.cancel_edit}
                    </Button>
                  )}
                </div>
              </>
            )}
            {error && (
              <Callout intent="danger" className="mx-4 mb-4">
                {error}
              </Callout>
            )}
          </Card>
        </div>
        <div className="w-full md:w-2/3 pb-8">
          {additionalOperatorNames.length > 0 && (
            <Callout className="flex items-center py-2 mb-2" icon={null} intent="primary">
              <Icon icon="info-sign" className="mr-1" />
              {t.components.editor.operator.EditorPerformer.ungrouped_operators}: {additionalOperatorNames.join(', ')}
            </Callout>
          )}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={clearDragPreview}
          >
            <Droppable id={globalOperatorContainerId} data={{ type: 'group' }}>
              <SectionTitle title={t.components.editor.operator.EditorPerformer.operators} />
              {operation.opers.length === 0 ? (
                <NonIdealState title={t.components.editor.operator.EditorPerformer.no_operators} />
              ) : (
                <SortableContext items={operatorIds} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-wrap">
                    {operation.opers.map((operator) => (
                      <Sortable className="mt-2 mr-2" key={operator.id} id={operator.id} data={{ type: 'operator' }}>
                        {(attrs) => (
                          <LegacyOperatorCard
                            operator={operator}
                            editing={editingOperatorId === operator.id}
                            onEdit={() => editOperator(operator)}
                            onRemove={() => removeOperator(operator.id)}
                            {...attrs}
                          />
                        )}
                      </Sortable>
                    ))}
                  </ul>
                </SortableContext>
              )}
            </Droppable>
            <SectionTitle className="mt-8" title={t.components.editor.operator.EditorPerformer.operator_groups} />
            {groups.length === 0 ? (
              <div className="relative">
                <NonIdealState title={t.components.editor.operator.EditorPerformer.no_operator_groups} />
              </div>
            ) : (
              <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-wrap">
                  {groups.map((group) => (
                    <Sortable className="mt-4 mr-4" key={group.id} id={group.id} data={{ type: 'group' }}>
                      {(attrs) => (
                        <LegacyGroupCard
                          group={group}
                          editing={editingGroupId === group.id}
                          editingOperatorId={editingOperatorId}
                          onEdit={() => editGroup(group)}
                          onRemove={() => removeGroup(group.id)}
                          onOperatorEdit={editOperator}
                          onOperatorRemove={(operator) => removeOperator(operator.id)}
                          {...attrs}
                        />
                      )}
                    </Sortable>
                  ))}
                </ul>
              </SortableContext>
            )}
            <DragOverlay>
              {draggingOperator && <LegacyOperatorCard operator={draggingOperator} />}
              {draggingGroup && <LegacyGroupCard group={draggingGroup} />}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </>
  )
}

const SectionTitle: FC<{ title: string; className?: string }> = ({ title, className }) => (
  <h3 className={`${className || ''} mb-2 font-bold`}>{title}</h3>
)
