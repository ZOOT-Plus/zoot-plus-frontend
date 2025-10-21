import { Button, Callout, Card, TextArea } from '@blueprintjs/core'
import { DevTool } from '@hookform/devtools'

import { useEffect, useMemo } from 'react'
import {
  Control,
  DeepPartial,
  FieldErrors,
  UseFormSetError,
  useForm,
  useWatch,
} from 'react-hook-form'

import { CardTitle } from 'components/CardTitle'
import { FormField, FormField2 } from 'components/FormField'
import { EditorResetButton } from 'components/editor/EditorResetButton'
import { FormError } from 'components/editor/FormError'
import { FormSubmitButton } from 'components/editor/FormSubmitButton'
import { EditorActionDocColor } from 'components/editor/action/EditorActionDocColor'
import {
  EditorActionExecPredicateCooling,
  EditorActionExecPredicateCostChange,
  EditorActionExecPredicateCosts,
  EditorActionExecPredicateKills,
} from 'components/editor/action/EditorActionExecPredicate'
import { EditorActionOperatorDirection } from 'components/editor/action/EditorActionOperatorDirection'
import { EditorActionOperatorLocation } from 'components/editor/action/EditorActionOperatorLocation'
import { EditorActionTypeSelect } from 'components/editor/action/EditorActionTypeSelect'
import { CopilotDocV1 } from 'models/copilot.schema'

import { useLevels } from '../../../apis/level'
import { useTranslation } from '../../../i18n/i18n'
import { findLevelByStageName } from '../../../models/level'
import { EditorOperatorName } from '../operator/EditorOperator'
import { EditorOperatorSkillTimes } from '../operator/EditorOperatorSkillTimes'
import { EditorOperatorSkillUsage } from '../operator/EditorOperatorSkillUsage'
import {
  EditorActionPreDelay,
  EditorActionRearDelay,
} from './EditorActionDelay'
import { EditorActionDistance } from './EditorActionDistance'
import { EditorActionModule } from './EditorActionModule'

export interface EditorActionAddProps {
  control: Control<CopilotDocV1.Operation>
  onSubmit: (
    action: CopilotDocV1.Action,
    setError: UseFormSetError<CopilotDocV1.Action>,
  ) => boolean
  onCancel: () => void
  editingAction?: CopilotDocV1.Action
}

const defaultAction: DeepPartial<CopilotDocV1.Action> = {
  type: CopilotDocV1.Type.Deploy,
}

const defaultMoveCameraAction: DeepPartial<CopilotDocV1.ActionMoveCamera> = {
  type: CopilotDocV1.Type.MoveCamera,
  distance: [4.5, 0],
}

export const EditorActionAdd = ({
  control: operationControl,
  editingAction,
  onSubmit: _onSubmit,
  onCancel,
}: EditorActionAddProps) => {
  const t = useTranslation()
  const isNew = !editingAction
  const operatorGroups = useWatch({ control: operationControl, name: 'groups' })
  const operators = useWatch({ control: operationControl, name: 'opers' })

  const {
    control,
    reset,
    setError,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CopilotDocV1.Action>({
    defaultValues: defaultAction,
  })

  const type = useWatch({ control, name: 'type' })
  const stageName = useWatch({ control: operationControl, name: 'stageName' })
  const skillUsage = useWatch({ control, name: 'skillUsage' })

  const { data: levels } = useLevels()
  const level = useMemo(
    () => findLevelByStageName(levels, stageName),
    [levels, stageName],
  )

  const resettingValues: DeepPartial<CopilotDocV1.Action> = useMemo(
    () => ({
      ...defaultAction,
      // to prevent layout jumping, we persist the action type on reset
      type,
      ...(type === 'MoveCamera' ? defaultMoveCameraAction : null),
    }),
    [type],
  )

  useEffect(() => {
    if (editingAction?.type) {
      setValue('type', editingAction.type)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAction?._id, setValue])

  useEffect(() => {
    if (editingAction) {
      // 修复切换type的时候，数据丢失的问题
      // 原因：因为切换type的时候会触发页面绘制，导致form和对应的item组件丢失绑定，
      // 当重置时没办法正常清空item组件内部的值。
      // 放入setTimeout中，延迟赋值，就可以避免丢失绑定的问题
      setTimeout(() => {
        // 修复先点击"部署"动作的编辑按钮，再连续点击"二倍速"动作的编辑按钮，"部署"的数据丢失
        // 原因：通过reset方式赋值给form，相当于将action变量跟form绑定，
        // 当再通过reset(undefined)后，会将action的值置为null，
        // 通过setValue的方式，不会将action和form绑定
        if ('doc' in editingAction) {
          setValue('doc', editingAction.doc)
        }
        if ('docColor' in editingAction) {
          setValue('docColor', editingAction.docColor)
        }
        if ('costs' in editingAction) {
          setValue('costs', editingAction.costs)
        }
        if ('costChanges' in editingAction) {
          setValue('costChanges', editingAction.costChanges)
        }
        if ('kills' in editingAction) {
          setValue('kills', editingAction.kills)
        }
        if ('cooling' in editingAction) {
          setValue('cooling', editingAction.cooling)
        }
        if ('preDelay' in editingAction) {
          setValue('preDelay', editingAction.preDelay)
        }
        if ('rearDelay' in editingAction) {
          setValue('rearDelay', editingAction.rearDelay)
        }
        if ('postDelay' in editingAction) {
          setValue('postDelay', editingAction.postDelay)
        }
        if ('name' in editingAction) {
          setValue('name', editingAction.name)
        }
        if ('direction' in editingAction) {
          setValue('direction', editingAction.direction)
        }
        if ('location' in editingAction) {
          setValue('location', editingAction.location)
        }
        if ('skillUsage' in editingAction) {
          setValue('skillUsage', editingAction.skillUsage)
        }
        if ('distance' in editingAction) {
          setValue('distance', editingAction.distance)
        }
      }, 0)
    } else {
      reset(resettingValues)
    }
  }, [editingAction, reset, resettingValues, setValue])

  useEffect(() => {
    if (type === 'MoveCamera') {
      reset(resettingValues)
    }
  }, [type, reset, resettingValues])

  useEffect(() => {
    setValue(
      'skillTimes',
      skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes
        ? ((editingAction as CopilotDocV1.ActionSkillUsage)?.skillTimes ?? 1)
        : undefined,
    )
  }, [skillUsage, editingAction, setValue])

  const onSubmit = handleSubmit((values) => {
    if ('name' in values) {
      values.name = values.name?.trim()
    }
    if (!values.doc) {
      delete values.docColor
    }

    if (_onSubmit(values, setError)) {
      reset(resettingValues)
    }
  })

  return (
    <form onSubmit={onSubmit}>
      <Card className="mb-2 pb-8 pt-4 overflow-auto">
        <div className="flex items-center mb-4">
          <CardTitle className="mb-0" icon={isNew ? 'add' : 'edit'}>
            <span>
              {isNew
                ? t.components.editor.action.EditorActionAdd.add
                : t.components.editor.action.EditorActionAdd.edit}
              {t.components.editor.action.EditorActionAdd.action}
            </span>
          </CardTitle>

          <div className="flex-1" />

          <FormSubmitButton control={control} icon={isNew ? 'add' : 'edit'}>
            {isNew
              ? t.components.editor.action.EditorActionAdd.add
              : t.components.editor.action.EditorActionAdd.save}
          </FormSubmitButton>

          <EditorResetButton
            reset={() => reset(resettingValues)}
            entityName={
              t.components.editor.action.EditorActionAdd.current_action
            }
          />
        </div>

        {import.meta.env.DEV && <DevTool control={control} />}

        <div className="flex flex-col lg:flex-row">
          <div className="flex flex-1">
            <FormField2
              label={t.components.editor.action.EditorActionAdd.action_type}
              field="type"
              error={errors.type}
              asterisk
            >
              <EditorActionTypeSelect control={control} name="type" />
            </FormField2>
          </div>
        </div>

        {(type === 'Deploy' ||
          type === 'Skill' ||
          type === 'Retreat' ||
          type === 'SkillUsage' ||
          type === 'BulletTime') && (
          <div className="flex">
            <FormField2<
              | CopilotDocV1.ActionDeploy
              | CopilotDocV1.ActionSkillOrRetreatOrBulletTime
            >
              label={
                t.components.editor.action.EditorActionAdd.operator_group_name
              }
              description={
                t.components.editor.action.EditorActionAdd
                  .select_operator_description
              }
              field="name"
              error={
                (
                  errors as FieldErrors<
                    | CopilotDocV1.ActionDeploy
                    | CopilotDocV1.ActionSkillOrRetreatOrBulletTime
                  >
                ).name
              }
              asterisk={type === 'Deploy'}
              FormGroupProps={{
                helperText: (
                  <>
                    <p>
                      {
                        t.components.editor.action.EditorActionAdd
                          .search_operator_hint
                      }
                    </p>
                    <p>
                      {
                        t.components.editor.action.EditorActionAdd
                          .reference_group_hint
                      }
                    </p>
                  </>
                ),
              }}
            >
              <EditorOperatorName
                shouldUnregister
                groups={operatorGroups}
                operators={operators}
                control={control}
                name="name"
                rules={{
                  required:
                    (type === 'Deploy' || type === 'SkillUsage') &&
                    t.components.editor.action.EditorActionAdd
                      .operator_required,
                }}
              />
            </FormField2>
          </div>
        )}

        {(type === 'Deploy' ||
          type === 'Skill' ||
          type === 'Retreat' ||
          type === 'BulletTime') && (
          <div className="flex">
            <EditorActionOperatorLocation
              shouldUnregister
              actionType={type}
              level={level}
              control={control}
              name="location"
            />
          </div>
        )}

        {type === 'Deploy' && (
          <div className="flex">
            <EditorActionOperatorDirection
              shouldUnregister
              control={control}
              name="direction"
            />
          </div>
        )}

        {type === 'SkillUsage' && (
          <div className="flex gap-2">
            <FormField2
              label={t.components.editor.action.EditorActionAdd.skill_usage}
              field="skillUsage"
              error={
                (errors as FieldErrors<CopilotDocV1.ActionSkillUsage>)
                  .skillUsage
              }
            >
              <EditorOperatorSkillUsage
                shouldUnregister
                control={control as Control<CopilotDocV1.ActionSkillUsage>}
                name="skillUsage"
                defaultValue={0}
              />
            </FormField2>

            {skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes && (
              <FormField2
                label={
                  t.components.editor.action.EditorActionAdd.skill_usage_count
                }
                field="skillTimes"
                error={
                  (errors as FieldErrors<CopilotDocV1.ActionSkillUsage>)
                    .skillTimes
                }
              >
                <EditorOperatorSkillTimes
                  control={control as Control<CopilotDocV1.ActionSkillUsage>}
                  name="skillTimes"
                />
              </FormField2>
            )}
          </div>
        )}

        {type === 'MoveCamera' && (
          <>
            <Callout>
              {t.components.editor.action.EditorActionAdd.camera_movement_hint}
            </Callout>
            <div className="flex mt-2">
              <EditorActionDistance
                shouldUnregister
                control={control}
                name="distance"
              />
            </div>
          </>
        )}

        <div className="h-px w-full bg-gray-200 mt-4 mb-6" />

        <EditorActionModule
          title={
            t.components.editor.action.EditorActionAdd.execution_conditions
          }
          icon="stopwatch"
          className="font-bold"
        >
          <div className="flex flex-wrap">
            <EditorActionExecPredicateKills control={control} />
            <EditorActionExecPredicateCooling control={control} />
          </div>
          <div className="flex flex-wrap">
            <EditorActionExecPredicateCosts control={control} />
            <EditorActionExecPredicateCostChange control={control} />
          </div>
          <div className="flex flex-wrap">
            <EditorActionPreDelay control={control} />
            <EditorActionRearDelay control={control} />
          </div>
        </EditorActionModule>
        <div className="h-px w-full bg-gray-200 mt-4 mb-6" />

        <EditorActionModule
          title={t.components.editor.action.EditorActionAdd.log}
          icon="annotation"
          className="font-bold"
        >
          <div className="flex flex-col w-full">
            <EditorActionDocColor
              shouldUnregister
              control={control}
              name="docColor"
            />

            <FormField
              label={t.components.editor.action.EditorActionAdd.description}
              field="doc"
              control={control}
              ControllerProps={{
                render: ({ field }) => (
                  <TextArea
                    fill
                    rows={2}
                    growVertically
                    large
                    id="doc"
                    placeholder={
                      t.components.editor.action.EditorActionAdd
                        .description_placeholder
                    }
                    {...field}
                    value={field.value || ''}
                  />
                ),
              }}
            />
          </div>
        </EditorActionModule>

        <div className="mt-4 flex">
          <FormSubmitButton control={control} icon={isNew ? 'add' : 'edit'}>
            {isNew
              ? t.components.editor.action.EditorActionAdd.add
              : t.components.editor.action.EditorActionAdd.save}
          </FormSubmitButton>

          {!isNew && (
            <Button icon="cross" className="ml-2" onClick={onCancel}>
              {t.components.editor.action.EditorActionAdd.cancel_edit}
            </Button>
          )}
        </div>

        <FormError errors={errors} />
      </Card>
    </form>
  )
}
