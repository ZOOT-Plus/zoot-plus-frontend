import { Button, Callout, Card, Checkbox, FormGroup, Icon, NonIdealState, TextArea, Tooltip } from '@blueprintjs/core'
import { DndContext, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { groupBy, uniqueId } from 'lodash-es'
import { useAtom, useAtomValue } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { FC, ReactNode, useEffect, useState } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { actionDocColors, operatorDirections } from '../../../models/operator'
import { ACTION_TYPES, findActionType } from '../../../models/types'
import { useMessage } from '../../../utils/messenger'
import { Sortable } from '../../dnd'
import { EditorAction, editorAtoms, useEdit } from '../core/editor-state'
import { createAction, useActionDragEnd } from '../core/models/action'
import { LegacyActionItem } from './LegacyActionItem'
import { DetailedSelect, DetailedSelectChoice, DetailedSelectItem } from './DetailedSelect'
import { LegacyFormGroup } from './LegacyFormGroup'
import { useLegacyFloatingMap } from './LegacyFloatingMapContext'
import { MAP_ORIGIN, TileClickMessage } from './LegacyMapConnection'
import { LegacyNumericInput } from './LegacyNumericInput'
import { LegacyOperatorName } from './LegacyOperatorName'
import { LegacySkillUsageSelect } from './LegacySkillUsageSelect'

type ActionType = CopilotDocV1.Type
type TupleField = 'location' | 'distance' | 'rect' | 'begin' | 'end'

const createLegacyAction = (type: ActionType): EditorAction => {
  const initialValues =
    type === CopilotDocV1.Type.MoveCamera
      ? { distance: [4.5, 0] as [number, number] }
      : type === CopilotDocV1.Type.Swipe
        ? {
            begin: [100, 100, 50, 50] as [number, number, number, number],
            end: [400, 400, 50, 50] as [number, number, number, number],
          }
        : {}
  return createAction({ type, ...initialValues })
}

const actionTypeItems: DetailedSelectItem[] = Object.values(
  groupBy(ACTION_TYPES, (item) => item.group.toString()),
).flatMap((items) => [{ type: 'header' as const, key: items[0].group(), header: items[0].group }, ...items])

const getActionValue = (action: EditorAction, key: string) => (action as unknown as Record<string, unknown>)[key]

const getStringActionValue = (action: EditorAction, key: string, fallback = '') => {
  const value = getActionValue(action, key)
  return typeof value === 'string' ? value : fallback
}

export const LegacyActionEditor: FC = () => {
  const t = useTranslation()
  const actions = useAtomValue(editorAtoms.actions)
  const operators = useAtomValue(editorAtoms.operators)
  const operatorGroups = useAtomValue(editorAtoms.groups)
  const [, setOperation] = useImmerAtom(editorAtoms.operation)
  const [activeActionId, setActiveActionId] = useAtom(editorAtoms.activeActionIdAtom)
  const [editingId, setEditingId] = useState<string>()
  const [draft, setDraft] = useState<EditorAction>(() => createLegacyAction(CopilotDocV1.Type.Deploy))
  const [draggingAction, setDraggingAction] = useState<EditorAction>()
  const [rearDelay, setRearDelay] = useState<number>()
  const [pendingRearDelay, setPendingRearDelay] = useState<number>()
  const edit = useEdit()
  const { setActiveTiles } = useLegacyFloatingMap()
  const handleDragEnd = useActionDragEnd()
  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggingAction(actions.find((action) => action.id === active.id))
  }
  const finishDragging = () => setDraggingAction(undefined)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )
  const setField = (key: string, value: unknown) => {
    setDraft((previous) => ({ ...previous, [key]: value }) as EditorAction)
  }

  const setTupleField = (key: TupleField, index: number, value: number | undefined) => {
    const length = key === 'rect' || key === 'begin' || key === 'end' ? 4 : 2
    const tuple =
      (getActionValue(draft, key) as (number | undefined)[] | undefined) ??
      Array<number | undefined>(length).fill(undefined)
    const nextTuple = [...tuple]
    nextTuple[index] = value
    setField(key, nextTuple.every((entry) => entry === undefined) ? undefined : nextTuple)
  }

  const startNew = (type: ActionType = CopilotDocV1.Type.Deploy) => {
    setEditingId(undefined)
    setDraft(createLegacyAction(type))
    setRearDelay(undefined)
    setActiveActionId(undefined)
  }

  const editAction = (action: EditorAction) => {
    const index = actions.findIndex((item) => item.id === action.id)
    setEditingId(action.id)
    setDraft({ ...action })
    setRearDelay(
      index >= 0
        ? (actions[index + 1]?.intermediatePreDelay ?? (index === actions.length - 1 ? pendingRearDelay : undefined))
        : undefined,
    )
    setActiveActionId(action.id)
  }

  const saveAction = () => {
    const action = { ...draft } as EditorAction
    const actionIndex = actions.findIndex((item) => item.id === action.id)
    if (actionIndex === -1 && pendingRearDelay !== undefined) {
      action.intermediatePreDelay = pendingRearDelay
    }
    if ('name' in action && action.name) action.name = action.name.trim()
    if (action.doc) action.docColor ??= 'Gray'
    else delete action.docColor

    edit(() => {
      setOperation((next) => {
        const index = next.actions.findIndex((item) => item.id === action.id)
        if (index === -1) {
          next.actions.push(action)
        } else {
          next.actions[index] = action
          if (next.actions[index + 1]) {
            next.actions[index + 1].intermediatePreDelay = rearDelay
          }
        }
      })
      return {
        action: editingId ? 'update-action' : 'add-action',
        desc: findActionType(action.type).title(),
      }
    })
    if (actionIndex === -1 || actionIndex === actions.length - 1) {
      setPendingRearDelay(rearDelay)
    }
    setEditingId(undefined)
    setDraft(createLegacyAction(action.type))
    setRearDelay(undefined)
  }

  const deleteAction = (id: string) => {
    const deletedIndex = actions.findIndex((action) => action.id === id)
    if (deletedIndex === actions.length - 1) {
      setPendingRearDelay(deletedIndex > 0 ? actions[deletedIndex].intermediatePreDelay : undefined)
    }
    edit(() => {
      setOperation((next) => {
        next.actions = next.actions.filter((action) => action.id !== id)
      })
      return { action: 'remove-action', desc: i18n.actions.editor2.delete_action }
    })
    if (activeActionId === id) setActiveActionId(undefined)
    if (editingId === id) startNew()
  }

  const duplicateAction = (action: EditorAction) => {
    const duplicate = { ...action, id: uniqueId() }
    edit(() => {
      setOperation((next) => {
        const index = next.actions.findIndex((item) => item.id === action.id)
        next.actions.splice(index + 1, 0, duplicate)
      })
      return { action: 'duplicate-action', desc: i18n.actions.editor2.duplicate_action }
    })
  }

  const isType = (...types: ActionType[]) => types.includes(draft.type)
  const extraSwipeItems: DetailedSelectChoice[] = [
    {
      type: 'choice',
      value: 0,
      icon: 'disable',
      title: t.components.editor.action.EditorActionSwipeParams.extra_swipe_disabled,
    },
    { type: 'choice', value: 1, icon: 'arrow-up', title: t.models.operator.direction.up },
    { type: 'choice', value: 2, icon: 'arrow-down', title: t.models.operator.direction.down },
    { type: 'choice', value: 3, icon: 'arrow-left', title: t.models.operator.direction.left },
    { type: 'choice', value: 4, icon: 'arrow-right', title: t.models.operator.direction.right },
  ]
  const directionItems: DetailedSelectChoice[] = operatorDirections.flatMap((direction) =>
    direction.value === null
      ? []
      : [
          {
            type: 'choice' as const,
            value: direction.value,
            icon: direction.icon,
            title: direction.title,
            description: t.components.editor.action.EditorActionOperatorDirection.direction_description,
          },
        ],
  )
  const selectedDirection = directionItems.find((item) => item.value === getActionValue(draft, 'direction'))
  const docColorItems: DetailedSelectChoice[] = actionDocColors.map((color) => ({
    type: 'choice',
    value: color.value,
    title: () => (
      <span>
        <Icon icon="full-circle" color={color.value} className="mr-2" />
        <span style={{ color: color.value }}>{color.title()}</span>
      </span>
    ),
  }))
  const needsOperator = isType(
    CopilotDocV1.Type.Deploy,
    CopilotDocV1.Type.Skill,
    CopilotDocV1.Type.Retreat,
    CopilotDocV1.Type.SkillUsage,
    CopilotDocV1.Type.BulletTime,
    CopilotDocV1.Type.SetUnitLocation,
  )
  const needsLocation = isType(
    CopilotDocV1.Type.Deploy,
    CopilotDocV1.Type.Skill,
    CopilotDocV1.Type.Retreat,
    CopilotDocV1.Type.BulletTime,
    CopilotDocV1.Type.SetUnitLocation,
    CopilotDocV1.Type.Click,
  )

  useEffect(() => {
    const [x, y] = (getActionValue(draft, 'location') as [number | undefined, number | undefined] | undefined) ?? []
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      setActiveTiles([{ x, y }])
    } else {
      setActiveTiles([])
    }
  }, [draft, setActiveTiles])

  useEffect(() => () => setActiveTiles([]), [setActiveTiles])

  useMessage<TileClickMessage>(MAP_ORIGIN, 'tileClick', ({ message }) => {
    if (!needsLocation) return
    const location = message.data.maaLocation
    setDraft(
      (previous) =>
        ({
          ...previous,
          location,
          ...(previous.type === CopilotDocV1.Type.Click ? { rect: undefined } : {}),
        }) as EditorAction,
    )
  })

  return (
    <section className="px-8 pb-8">
      <h3 className="mb-2 text-lg font-bold">
        {t.components.editor.OperationEditor.action_sequence} ({actions.length})
      </h3>
      <div className="flex flex-wrap md:flex-nowrap min-h-[calc(100vh-6rem)]">
        <div className="w-full md:w-1/2 md:mr-8">
          <Card className="mb-2 pb-8 pt-4 overflow-auto">
            <div className="flex items-center mb-4">
              <h4 className="font-bold">
                {editingId
                  ? t.components.editor.action.EditorActionAdd.edit
                  : t.components.editor.action.EditorActionAdd.add}
                {t.components.editor.action.EditorActionAdd.action}
              </h4>
              <div className="flex-1" />
              <Button
                minimal
                icon="reset"
                title={t.components.editor.action.EditorActionAdd.current_action}
                onClick={() => startNew(draft.type)}
              />
            </div>
            <FormGroup label={t.components.editor.action.EditorActionAdd.action_type} labelInfo="*">
              <DetailedSelect
                items={actionTypeItems}
                value={draft.type}
                onItemSelect={(item) => {
                  const next = createLegacyAction(item.value as ActionType)
                  setDraft((previous) => ({
                    ...next,
                    id: previous.id,
                    doc: previous.doc,
                    docColor: previous.docColor,
                    costs: previous.costs,
                    costChanges: previous.costChanges,
                    kills: previous.kills,
                    cooling: previous.cooling,
                    ...('role' in previous ? { role: previous.role } : {}),
                    intermediatePreDelay: previous.intermediatePreDelay,
                    intermediatePostDelay: previous.intermediatePostDelay,
                  }))
                }}
              >
                <Button
                  large
                  icon={findActionType(draft.type).icon}
                  text={findActionType(draft.type).title()}
                  rightIcon="double-caret-vertical"
                />
              </DetailedSelect>
            </FormGroup>
            {needsOperator && (
              <LegacyFormGroup
                label={t.components.editor.action.EditorActionAdd.operator_group_name}
                description={t.components.editor.action.EditorActionAdd.select_operator_description}
                helperText={
                  <>
                    <p>{t.components.editor.action.EditorActionAdd.search_operator_hint}</p>
                    <p>{t.components.editor.action.EditorActionAdd.reference_group_hint}</p>
                  </>
                }
                labelInfo={
                  draft.type === CopilotDocV1.Type.Deploy || draft.type === CopilotDocV1.Type.SetUnitLocation
                    ? '*'
                    : undefined
                }
              >
                <LegacyOperatorName
                  value={getStringActionValue(draft, 'name')}
                  onChange={(name) => setField('name', name)}
                  groups={operatorGroups}
                  operators={operators}
                />
              </LegacyFormGroup>
            )}
            {draft.type === CopilotDocV1.Type.Click && (
              <Callout className="mb-2">{t.components.editor.action.EditorActionAdd.click_hint}</Callout>
            )}
            {draft.type === CopilotDocV1.Type.SetUnitLocation && (
              <Callout className="mb-2">{t.components.editor.action.EditorActionAdd.set_unit_location_hint}</Callout>
            )}
            {draft.type === CopilotDocV1.Type.Swipe && (
              <Callout className="mb-2">{t.components.editor.action.EditorActionAdd.swipe_hint}</Callout>
            )}
            {needsLocation && (
              <TupleFields
                action={draft}
                field="location"
                length={2}
                label={t.components.editor.action.EditorActionOperatorLocation.operator_location}
                description={t.components.editor.action.EditorActionOperatorLocation.map_location_description}
                helperText={t.components.editor.action.EditorActionOperatorLocation.click_on_map}
                onChange={setTupleField}
              />
            )}
            {draft.type === CopilotDocV1.Type.Click && (
              <TupleFields
                action={draft}
                field="rect"
                length={4}
                label={t.components.editor.action.EditorActionAdd.pixel_rect}
                onChange={setTupleField}
              />
            )}
            {draft.type === CopilotDocV1.Type.Swipe && (
              <>
                <TupleFields
                  action={draft}
                  field="begin"
                  length={4}
                  label={t.components.editor.action.EditorActionAdd.swipe_begin}
                  onChange={setTupleField}
                />
                <TupleFields
                  action={draft}
                  field="end"
                  length={4}
                  label={t.components.editor.action.EditorActionAdd.swipe_end}
                  onChange={setTupleField}
                />
                <div className="flex flex-wrap gap-2">
                  <NumberField
                    label={t.components.editor.action.EditorActionSwipeParams.duration}
                    value={getActionValue(draft, 'duration')}
                    onChange={(value) => setField('duration', value)}
                    intOnly
                    min={0}
                    stepSize={100}
                  />
                  <FormGroup label={t.components.editor.action.EditorActionSwipeParams.extra_swipe}>
                    <DetailedSelect
                      items={extraSwipeItems}
                      value={Number(getActionValue(draft, 'extraSwipe') ?? 0)}
                      onItemSelect={(item) => setField('extraSwipe', item.value === 0 ? undefined : item.value)}
                    >
                      <Button
                        text={
                          (extraSwipeItems.find(
                            (item) => item.value === Number(getActionValue(draft, 'extraSwipe') ?? 0),
                          )?.title as string) || t.components.editor.action.EditorActionSwipeParams.extra_swipe_disabled
                        }
                        rightIcon="double-caret-vertical"
                      />
                    </DetailedSelect>
                  </FormGroup>
                  <NumberField
                    label={t.components.editor.action.EditorActionSwipeParams.slope_in}
                    value={getActionValue(draft, 'slopeIn')}
                    onChange={(value) => setField('slopeIn', value)}
                    intOnly
                    min={0}
                    placeholder="10"
                  />
                  <NumberField
                    label={t.components.editor.action.EditorActionSwipeParams.slope_out}
                    value={getActionValue(draft, 'slopeOut')}
                    onChange={(value) => setField('slopeOut', value)}
                    intOnly
                    min={0}
                    placeholder="10"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <Checkbox
                    label={t.components.editor.action.EditorActionSwipeParams.with_pause}
                    checked={!!getActionValue(draft, 'withPause')}
                    onChange={(event) => setField('withPause', event.currentTarget.checked || undefined)}
                  />
                  <Checkbox
                    labelElement={
                      <span>
                        {t.components.editor.action.EditorActionSwipeParams.high_resolution_swipe_fix}
                        <Tooltip
                          className="!inline-block !mt-0"
                          interactionKind="hover"
                          content={t.components.editor.action.EditorActionSwipeParams.high_resolution_swipe_fix_tip}
                        >
                          <Icon className="ml-1 text-slate-600 dark:text-slate-100" icon="help" />
                        </Tooltip>
                      </span>
                    }
                    checked={!!getActionValue(draft, 'highResolutionSwipeFix')}
                    onChange={(event) => setField('highResolutionSwipeFix', event.currentTarget.checked || undefined)}
                  />
                </div>
              </>
            )}
            {draft.type === CopilotDocV1.Type.MoveCamera && (
              <>
                <Callout>{t.components.editor.action.EditorActionAdd.camera_movement_hint}</Callout>
                <TupleFields
                  action={draft}
                  field="distance"
                  length={2}
                  label={t.components.editor.action.EditorActionDistance.movement_distance}
                  onChange={setTupleField}
                />
                <Checkbox
                  checked={!!getActionValue(draft, 'keepKills')}
                  label={t.components.editor.action.EditorActionAdd.keep_kills}
                  onChange={(event) => setField('keepKills', event.currentTarget.checked || undefined)}
                />
              </>
            )}
            {draft.type === CopilotDocV1.Type.Deploy && (
              <LegacyFormGroup
                label={t.components.editor.action.EditorActionOperatorDirection.operator_direction}
                description={t.components.editor.action.EditorActionOperatorDirection.direction_description}
              >
                <DetailedSelect
                  items={directionItems}
                  value={
                    (getActionValue(draft, 'direction') as CopilotDocV1.Direction | undefined) ??
                    CopilotDocV1.Direction.None
                  }
                  onItemSelect={(item) => setField('direction', item.value as CopilotDocV1.Direction)}
                >
                  <Button
                    icon={selectedDirection?.icon}
                    text={
                      selectedDirection
                        ? typeof selectedDirection.title === 'function'
                          ? selectedDirection.title()
                          : selectedDirection.title
                        : t.models.operator.direction.none
                    }
                    rightIcon="double-caret-vertical"
                  />
                </DetailedSelect>
              </LegacyFormGroup>
            )}
            {draft.type === CopilotDocV1.Type.SkillUsage && (
              <>
                <FormGroup label={t.components.editor.action.EditorActionAdd.skill_usage}>
                  <LegacySkillUsageSelect
                    value={Number(getActionValue(draft, 'skillUsage') ?? 0) as CopilotDocV1.SkillUsageType}
                    onChange={(value) => setField('skillUsage', value)}
                  />
                </FormGroup>
                {Number(getActionValue(draft, 'skillUsage')) === CopilotDocV1.SkillUsageType.ReadyToUseTimes && (
                  <NumberField
                    label={t.components.editor.action.EditorActionAdd.skill_usage_count}
                    value={getActionValue(draft, 'skillTimes')}
                    onChange={(value) => setField('skillTimes', value)}
                  />
                )}
              </>
            )}
            <div className="h-px w-full bg-gray-200 mt-4 mb-6" />
            <h5 className="mb-2 font-bold">{t.components.editor.action.EditorActionAdd.execution_conditions}</h5>
            <div className="flex flex-wrap gap-2">
              <NumberField
                label={t.components.editor.action.EditorActionExecPredicate.cost_condition}
                description={t.components.editor.action.EditorActionExecPredicate.cost_condition_description}
                value={getActionValue(draft, 'costs')}
                onChange={(value) => setField('costs', value)}
                intOnly
                min={0}
                placeholder={t.components.editor.action.EditorActionExecPredicate.dp_cost}
              />
              <NumberField
                label={t.components.editor.action.EditorActionExecPredicate.cost_change_condition}
                description={t.components.editor.action.EditorActionExecPredicate.cost_change_description}
                value={getActionValue(draft, 'costChanges')}
                onChange={(value) => setField('costChanges', value)}
                intOnly
                placeholder={t.components.editor.action.EditorActionExecPredicate.dp_change_amount}
              />
              <NumberField
                label={t.components.editor.action.EditorActionExecPredicate.kill_count_condition}
                description={t.components.editor.action.EditorActionExecPredicate.kill_count_description}
                value={getActionValue(draft, 'kills')}
                onChange={(value) => setField('kills', value)}
                intOnly
                min={0}
                placeholder={t.components.editor.action.EditorActionExecPredicate.kill_count}
              />
              <NumberField
                label={t.components.editor.action.EditorActionExecPredicate.cooldown_operator_condition}
                description={t.components.editor.action.EditorActionExecPredicate.cooldown_description}
                value={getActionValue(draft, 'cooling')}
                onChange={(value) => setField('cooling', value)}
                intOnly
                min={0}
                placeholder={t.components.editor.action.EditorActionExecPredicate.cooldown_count}
              />
              <NumberField
                label={t.components.editor.action.EditorActionDelay.pre_delay}
                description={t.components.editor.action.EditorActionDelay.delay_description}
                value={getActionValue(draft, 'intermediatePostDelay')}
                onChange={(value) => setField('intermediatePostDelay', value)}
                intOnly
                min={0}
                stepSize={100}
                placeholder={t.components.editor.action.EditorActionDelay.pre_delay}
              />
              <NumberField
                label={t.components.editor.action.EditorActionDelay.post_delay}
                description={t.components.editor.action.EditorActionDelay.delay_description}
                value={rearDelay}
                onChange={setRearDelay}
                intOnly
                min={0}
                stepSize={100}
                placeholder={t.components.editor.action.EditorActionDelay.post_delay}
              />
            </div>
            <div className="h-px w-full bg-gray-200 mt-4 mb-6" />
            <h5 className="mb-2 font-bold">{t.components.editor.action.EditorActionAdd.log}</h5>
            <FormGroup label={t.components.editor.action.EditorActionAdd.description}>
              <TextArea
                fill
                rows={2}
                autoResize
                large
                value={getStringActionValue(draft, 'doc')}
                placeholder={t.components.editor.action.EditorActionAdd.description_placeholder}
                onChange={(event) => setField('doc', event.target.value || undefined)}
              />
            </FormGroup>
            <LegacyFormGroup
              label={t.components.editor.action.EditorActionDocColor.description_color}
              description={t.components.editor.action.EditorActionDocColor.color_description}
            >
              <DetailedSelect
                items={docColorItems}
                value={getStringActionValue(draft, 'docColor', 'Gray')}
                onItemSelect={(item) => setField('docColor', item.value)}
              >
                <Button rightIcon="double-caret-vertical">
                  <Icon
                    icon="full-circle"
                    color={
                      actionDocColors.find((color) => color.value === getStringActionValue(draft, 'docColor', 'Gray'))
                        ?.value
                    }
                    className="mr-2"
                  />
                  <span
                    style={{
                      color: actionDocColors.find(
                        (color) => color.value === getStringActionValue(draft, 'docColor', 'Gray'),
                      )?.value,
                    }}
                  >
                    {actionDocColors
                      .find((color) => color.value === getStringActionValue(draft, 'docColor', 'Gray'))
                      ?.title()}
                  </span>
                </Button>
              </DetailedSelect>
            </LegacyFormGroup>
            <div className="mt-4 flex gap-2">
              <Button intent="primary" icon={editingId ? 'edit' : 'add'} onClick={saveAction}>
                {editingId
                  ? t.components.editor.action.EditorActionAdd.save
                  : t.components.editor.action.EditorActionAdd.add}
              </Button>
              {editingId && (
                <Button icon="cross" onClick={() => startNew(draft.type)}>
                  {t.components.editor.action.EditorActionAdd.cancel_edit}
                </Button>
              )}
            </div>
          </Card>
        </div>
        <div className="w-full md:w-1/2 overflow-auto h-[calc(100vh-6rem)] p-2 pt-0 pb-8 -mx-2">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={(event) => {
              handleDragEnd(event)
              finishDragging()
            }}
            onDragCancel={finishDragging}
          >
            <SortableContext items={actions.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
              <ul>
                {actions.map((action, index) => (
                  <Sortable id={action.id} key={action.id} className="mt-2">
                    {(attrs) => (
                      <LegacyActionItem
                        action={action}
                        rearDelay={actions[index + 1]?.intermediatePreDelay}
                        editing={editingId === action.id}
                        onEdit={() => (editingId === action.id ? startNew(action.type) : editAction(action))}
                        onDuplicate={() => duplicateAction(action)}
                        onRemove={() => deleteAction(action.id)}
                        {...attrs}
                      />
                    )}
                  </Sortable>
                ))}
              </ul>
            </SortableContext>
            <DragOverlay>
              {draggingAction && <LegacyActionItem action={draggingAction} editing={editingId === draggingAction.id} />}
            </DragOverlay>
          </DndContext>
          {actions.length === 0 && (
            <NonIdealState title={t.components.editor.action.EditorActions.no_actions} icon="inbox" />
          )}
        </div>
      </div>
    </section>
  )
}

interface NumberFieldProps {
  label: string
  description?: ReactNode
  value: unknown
  onChange: (value: number | undefined) => void
  intOnly?: boolean
  min?: number
  max?: number
  stepSize?: number
  placeholder?: string
}

const NumberField: FC<NumberFieldProps> = ({ label, description, value, onChange, placeholder, ...inputProps }) => (
  <LegacyFormGroup label={label} description={description}>
    <LegacyNumericInput
      fill
      {...inputProps}
      placeholder={placeholder}
      value={typeof value === 'number' ? value : ''}
      onValueChange={(next) => onChange(Number.isFinite(next) ? next : undefined)}
    />
  </LegacyFormGroup>
)

interface TupleFieldsProps {
  action: EditorAction
  field: TupleField
  length: 2 | 4
  label: string
  onChange: (field: TupleField, index: number, value: number | undefined) => void
  description?: ReactNode
  helperText?: ReactNode
}

const TupleFields: FC<TupleFieldsProps> = ({ action, field, length, label, onChange, description, helperText }) => {
  const t = useTranslation()
  const tuple = getActionValue(action, field) as number[] | undefined
  const placeholders =
    field === 'location'
      ? [
          t.components.editor.action.EditorActionOperatorLocation.x_coordinate,
          t.components.editor.action.EditorActionOperatorLocation.y_coordinate,
        ]
      : field === 'distance'
        ? [
            t.components.editor.action.EditorActionDistance.x_distance,
            t.components.editor.action.EditorActionDistance.y_distance,
          ]
        : field === 'rect' || field === 'begin' || field === 'end'
          ? [
              t.components.editor.action.EditorActionRect.x,
              t.components.editor.action.EditorActionRect.y,
              t.components.editor.action.EditorActionRect.w,
              t.components.editor.action.EditorActionRect.h,
            ]
          : ['X', 'Y']
  return (
    <LegacyFormGroup label={label} description={description} helperText={helperText}>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length }, (_, index) => (
          <LegacyNumericInput
            key={index}
            style={{ width: field === 'distance' ? 104 : 72 }}
            intOnly={field !== 'distance'}
            min={field === 'distance' ? undefined : 0}
            placeholder={placeholders[index]}
            value={tuple?.[index] ?? ''}
            onValueChange={(value) => onChange(field, index, Number.isFinite(value) ? value : undefined)}
          />
        ))}
      </div>
    </LegacyFormGroup>
  )
}
