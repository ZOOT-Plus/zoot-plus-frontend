import {
  Button,
  Callout,
  Card,
  Classes,
  Divider,
  Icon,
  InputGroup,
  MenuItem,
  PopoverInteractionKind,
  Switch,
  Tooltip,
} from '@blueprintjs/core'

import clsx from 'clsx'
import { Draft } from 'immer'
import { PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { selectAtom } from 'jotai/utils'
import { FC, Fragment, ReactNode, memo, useEffect, useRef, useState } from 'react'

import { i18n, languageAtom, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import {
  actionDocColors,
  alternativeOperatorSkillUsages,
  findOperatorByName,
  findOperatorDirection,
  getLocalizedOperatorName,
  getSkillUsageAltTitle,
} from '../../../models/operator'
import { findActionType } from '../../../models/types'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { SortableItemProps } from '../../dnd'
import { DetailedSelect } from '../../editor/DetailedSelect'
import { NumericInput2 } from '../../editor/NumericInput2'
import { EditorAction, editorAtoms, useActiveState, useEdit } from '../editor-state'
import { OperatorSelect } from '../operator/OperatorSelect'
import { createAction } from '../reconciliation'
import { useEntityErrors } from '../validation/validation'
import { ActionLinker } from './ActionLinker'

interface ActionItemProps extends Partial<SortableItemProps> {
  className?: string
  actionAtom: PrimitiveAtom<EditorAction>
}

// extra_swipe 的取值：0 不启用，1/2/3/4 分别为上/下/左/右（与 MAA 协议一致）
const EXTRA_SWIPE_DIRECTIONS = [
  { value: 0, direction: undefined, icon: 'disable' },
  { value: 1, direction: CopilotDocV1.Direction.Up, icon: 'arrow-up' },
  { value: 2, direction: CopilotDocV1.Direction.Down, icon: 'arrow-down' },
  { value: 3, direction: CopilotDocV1.Direction.Left, icon: 'arrow-left' },
  { value: 4, direction: CopilotDocV1.Direction.Right, icon: 'arrow-right' },
] as const

export const ActionItem: FC<ActionItemProps> = memo(
  ({ className, actionAtom, isDragging, isSorting, attributes, listeners }) => {
    const t = useTranslation()
    const language = useAtomValue(languageAtom)
    const edit = useEdit()
    const dispatchActions = useSetAtom(editorAtoms.actionAtoms as any)
    const [action, setAction] = useImmerAtom(actionAtom)
    const [active, setActive] = useActiveState(editorAtoms.activeActionIdAtom as any, action.id)
    const errors = useEntityErrors(action.id)
    const [docDraft, setDocDraft] = useState<string | undefined>()
    const [docInput, setDocInput] = useState<HTMLInputElement | null>(null)
    const shouldFocusDocInput = useRef(false)
    const typeInfo = findActionType(action.type)
    const doc = action.doc ?? docDraft

    useEffect(() => {
      if (docInput && shouldFocusDocInput.current) {
        shouldFocusDocInput.current = false
        docInput.focus()
      }
    }, [docInput])

    // 类型断言不能用在多个参数上，所以只能组装成一个对象然后再解构了
    // https://github.com/microsoft/TypeScript/issues/26916
    type RenderArgs<A> = {
      actionAtom: PrimitiveAtom<A>
      action: A
      setAction: (fn: (draft: Draft<A>) => void) => void
    }
    const renderForTypes = <T extends CopilotDocV1.Type, A extends EditorAction = Extract<EditorAction, { type: T }>>(
      types: T[],
      render: (args: RenderArgs<A>) => ReactNode,
    ) => {
      if (types.includes(action.type as T)) {
        return render({ actionAtom, action, setAction } as RenderArgs<A>)
      }
      return null
    }

    return (
      <div onMouseDownCapture={() => setActive(true)}>
        <ActionLinker actionAtom={actionAtom} isDragging={isDragging} isSorting={isSorting} />
        <Card className={clsx(className, 'card-shadow-subtle !p-0 !rounded overflow-hidden', typeInfo.accentText)}>
          <div className="flex flex-wrap items-center !text-inherit">
            <h4
              className={clsx(
                'relative shrink-0 self-stretch w-[5em] text-2xl font-serif bg-gray-100 dark:bg-gray-700 cursor-move select-none touch-manipulation',
                // regarding the calc(), we try to make the right border tilt by 12deg, so the x coordinate
                // of the bottom right corner will be 100% - height * tan(12deg), where height turns out to be 4.5rem
                '[clip-path:polygon(0_0,100%_0,calc(100%-.96rem)_100%,0_100%)]',
                language === 'cn' && 'font-bold',
              )}
              {...attributes}
              {...listeners}
            >
              <div
                className={clsx(
                  'p-1 pl-2 w-full',
                  // hide the underneath element later to avoid edge cases where the above element does not align perfectly
                  active && 'opacity-0 transition-opacity delay-100',
                )}
              >
                {typeInfo.shortTitle()}
              </div>
              <div
                className={clsx(
                  'p-1 pl-2 w-full',
                  'absolute top-0 bottom-0 left-0 text-white transition-[clip-path]',
                  typeInfo.accentBg,
                  active
                    ? '[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)]'
                    : '[clip-path:polygon(0_0,4px_0,4px_100%,0_100%)]',
                )}
              >
                {typeInfo.shortTitle()}
              </div>
            </h4>
            <div className="flex-[0_1_1rem]" />
            {renderForTypes(
              [
                CopilotDocV1.Type.Deploy,
                CopilotDocV1.Type.Retreat,
                CopilotDocV1.Type.Skill,
                CopilotDocV1.Type.SkillUsage,
                CopilotDocV1.Type.BulletTime,
                CopilotDocV1.Type.SetUnitLocation,
              ],
              ({ actionAtom }) => (
                <ActionTarget actionAtom={actionAtom} />
              ),
            )}
            {renderForTypes(
              [
                CopilotDocV1.Type.Deploy,
                CopilotDocV1.Type.Retreat,
                CopilotDocV1.Type.Skill,
                CopilotDocV1.Type.BulletTime,
              ],
              ({ action, setAction }) => (
                <>
                  <div className="grow self-stretch max-w-10 flex flex-col items-center text-xs">
                    {action.type === CopilotDocV1.Type.Skill ||
                    action.type === CopilotDocV1.Type.Retreat ||
                    action.type === CopilotDocV1.Type.BulletTime ? (
                      <>
                        <Divider className="grow rotate-12 ml-3" />
                        <Tooltip placement="top" content={t.components.editor2.ActionItem.target_or_location}>
                          {t.components.editor2.ActionItem.or}
                        </Tooltip>
                        <Divider className="grow rotate-12 mr-3" />
                      </>
                    ) : (
                      <Divider className="grow rotate-12" />
                    )}
                  </div>
                  <div className="shrink-0">
                    <div className="flex items-center text-3xl">
                      <span className="text-gray-300 dark:text-gray-600">{'('}</span>
                      <NumericInput2
                        intOnly
                        buttonPosition="none"
                        inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                        style={{
                          width: String(action.location?.[0] ?? 0).length + 'ch',
                        }}
                        value={action.location?.[0] ?? ''}
                        wheelStepSize={1}
                        onValueChange={(v) => {
                          edit(() => {
                            setAction((draft) => {
                              draft.location = [v, draft.location?.[1] ?? 0]
                            })
                            return {
                              action: 'set-action-location-x',
                              desc: i18n.actions.editor2.set_action_location,
                              squashBy: action.id,
                            }
                          })
                        }}
                      />
                      <span className="mt-3 text-gray-300 dark:text-gray-600 text-xl font-serif">,</span>
                      <NumericInput2
                        intOnly
                        buttonPosition="none"
                        inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                        style={{
                          width: String(action.location?.[1] ?? 0).length + 'ch',
                        }}
                        value={action.location?.[1] ?? ''}
                        wheelStepSize={1}
                        onValueChange={(v) => {
                          edit(() => {
                            setAction((draft) => {
                              draft.location = [draft.location?.[0] ?? 0, v]
                            })
                            return {
                              action: 'set-action-location-y',
                              desc: i18n.actions.editor2.set_action_location,
                              squashBy: action.id,
                            }
                          })
                        }}
                      />
                      <span className="text-gray-300 dark:text-gray-600">{')'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.location}</div>
                  </div>
                </>
              ),
            )}
            {renderForTypes([CopilotDocV1.Type.Click], ({ action, setAction }) => (
              <>
                <div className="shrink-0">
                  <div className="flex items-center text-3xl">
                    <span className="text-gray-300 dark:text-gray-600">{'('}</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      style={{
                        width: String(action.location?.[0] ?? 0).length + 'ch',
                      }}
                      value={action.location?.[0] ?? ''}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            // 清空输入时 NumericInput2 回调 NaN，转成 undefined 以免 NaN 落进状态与序列化；
                            // 两位都空时删除整个字段，半填是编辑中间态（导出会被校验拦下要求补全）
                            const x = Number.isNaN(v) ? undefined : v
                            if (x === undefined && draft.location?.[1] === undefined) {
                              delete draft.location
                            } else {
                              draft.location = [x, draft.location?.[1]]
                            }
                          })
                          return {
                            action: 'set-action-location-x',
                            desc: i18n.actions.editor2.set_action_location,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="mt-3 text-gray-300 dark:text-gray-600 text-xl font-serif">,</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      style={{
                        width: String(action.location?.[1] ?? 0).length + 'ch',
                      }}
                      value={action.location?.[1] ?? ''}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            const y = Number.isNaN(v) ? undefined : v
                            if (y === undefined && draft.location?.[0] === undefined) {
                              delete draft.location
                            } else {
                              draft.location = [draft.location?.[0], y]
                            }
                          })
                          return {
                            action: 'set-action-location-y',
                            desc: i18n.actions.editor2.set_action_location,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="text-gray-300 dark:text-gray-600">{')'}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.location}</div>
                </div>
                <div className="grow self-stretch max-w-10 flex flex-col items-center text-xs">
                  <Divider className="grow rotate-12 ml-3" />
                  <Tooltip placement="top" content={t.components.editor2.ActionItem.rect_or_location}>
                    {t.components.editor2.ActionItem.or}
                  </Tooltip>
                  <Divider className="grow rotate-12 mr-3" />
                </div>
                <div className="shrink-0">
                  <div className="flex items-center text-2xl">
                    <span className="text-gray-300 dark:text-gray-600">{'['}</span>
                    <RectInput
                      value={action.rect}
                      onChange={(value) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.rect = value
                          })
                          return {
                            action: 'set-action-rect',
                            desc: i18n.actions.editor2.set_action_rect,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="text-gray-300 dark:text-gray-600">{']'}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.rect}</div>
                </div>
              </>
            ))}
            {renderForTypes([CopilotDocV1.Type.MoveCamera], ({ action, setAction }) => (
              <>
                <div className="grow self-stretch max-w-10 flex flex-col items-center text-xs">
                  <Divider className="grow rotate-12" />
                </div>
                <div className="shrink-0">
                  <div className="flex items-center text-3xl">
                    <span className="text-gray-300 dark:text-gray-600">{'('}</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      value={action.distance?.[0] ?? ''}
                      style={{
                        width: String(action.distance?.[0] ?? 0).length + 'ch',
                      }}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.distance = [v, draft.distance?.[1] ?? 0]
                          })
                          return {
                            action: 'set-action-distance-x',
                            desc: i18n.actions.editor2.set_action_distance,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="mt-3 text-gray-300 dark:text-gray-600 text-xl font-serif">,</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      value={action.distance?.[1] ?? ''}
                      style={{
                        width: String(action.distance?.[1] ?? 0).length + 'ch',
                      }}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.distance = [draft.distance?.[0] ?? 0, v]
                          })
                          return {
                            action: 'set-action-distance-y',
                            desc: i18n.actions.editor2.set_action_distance,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="text-gray-300 dark:text-gray-600">{')'}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.distance}</div>
                </div>
                <div className="grow self-stretch max-w-10 flex flex-col items-center text-xs">
                  <Divider className="grow rotate-12" />
                </div>
                <Switch
                  className="mt-2 !mb-0"
                  labelElement={
                    <span className="text-xs font-normal">
                      {t.components.editor2.label.operation.actions.keep_kills}
                    </span>
                  }
                  checked={action.keepKills ?? false}
                  onChange={(e) => {
                    edit(() => {
                      setAction((draft) => {
                        // false 是默认值，只在开启时写出，避免序列化出多余的 keep_kills: false
                        if (e.target.checked) {
                          draft.keepKills = true
                        } else {
                          delete draft.keepKills
                        }
                      })
                      return {
                        action: 'set-action-keepKills',
                        desc: i18n.actions.editor2.set_action_keep_kills,
                        squashBy: action.id,
                      }
                    })
                  }}
                />
              </>
            ))}
            {renderForTypes([CopilotDocV1.Type.Swipe], ({ action, setAction }) => (
              <>
                <div className="grow self-stretch max-w-10 flex flex-col items-center text-xs">
                  <Divider className="grow rotate-12" />
                </div>
                <div className="shrink-0">
                  <div className="flex items-center text-xl">
                    <RectInput
                      value={action.begin}
                      onChange={(value) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.begin = value
                          })
                          return {
                            action: 'set-action-begin',
                            desc: i18n.actions.editor2.set_action_begin,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.begin}</div>
                </div>
                <Icon
                  className="mx-1 mb-4 shrink-0 self-end text-gray-400 dark:text-gray-500"
                  icon="arrow-right"
                  size={20}
                />
                <div className="shrink-0">
                  <div className="flex items-center text-xl">
                    <RectInput
                      value={action.end}
                      onChange={(value) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.end = value
                          })
                          return {
                            action: 'set-action-end',
                            desc: i18n.actions.editor2.set_action_end,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.end}</div>
                </div>
              </>
            ))}
            {renderForTypes([CopilotDocV1.Type.SetUnitLocation], ({ action, setAction }) => (
              <>
                <div className="grow self-stretch max-w-10 flex items-stretch justify-center">
                  <Divider className="rotate-12" />
                </div>
                <div className="shrink-0">
                  <div className="flex items-center text-3xl">
                    <span className="text-gray-300 dark:text-gray-600">{'('}</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      style={{
                        width: String(action.location?.[0] ?? 0).length + 'ch',
                      }}
                      value={action.location?.[0] ?? ''}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            // 必填字段，与部署一致：半填时另一位补 0，不留 undefined 中间态
                            draft.location = [v, draft.location?.[1] ?? 0]
                          })
                          return {
                            action: 'set-action-location-x',
                            desc: i18n.actions.editor2.set_action_location,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="mt-3 text-gray-300 dark:text-gray-600 text-xl font-serif">,</span>
                    <NumericInput2
                      intOnly
                      buttonPosition="none"
                      inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit text-3xl font-semibold text-center"
                      style={{
                        width: String(action.location?.[1] ?? 0).length + 'ch',
                      }}
                      value={action.location?.[1] ?? ''}
                      wheelStepSize={1}
                      onValueChange={(v) => {
                        edit(() => {
                          setAction((draft) => {
                            draft.location = [draft.location?.[0] ?? 0, v]
                          })
                          return {
                            action: 'set-action-location-y',
                            desc: i18n.actions.editor2.set_action_location,
                            squashBy: action.id,
                          }
                        })
                      }}
                    />
                    <span className="text-gray-300 dark:text-gray-600">{')'}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.location}</div>
                </div>
              </>
            ))}
            {renderForTypes([CopilotDocV1.Type.Deploy], ({ action, setAction }) => (
              <>
                <div className="grow self-stretch max-w-10 flex items-stretch justify-center">
                  <Divider className="rotate-12" />
                </div>
                <div className="mt-2 !text-inherit">
                  <div className="flex items-center !text-inherit">
                    {Object.values(CopilotDocV1.Direction).map((dir) => (
                      <Button
                        small
                        minimal
                        className={clsx(
                          '!px-2.5 !bg-transparent [&_.bp6-icon]:!text-current',
                          action.direction === dir
                            ? '!text-inherit drop-shadow'
                            : '!text-gray-200 hover:!text-gray-400',
                        )}
                        key={dir}
                        active={action.direction === dir}
                        onClick={() => {
                          edit(() => {
                            setAction((draft) => {
                              draft.direction = dir
                            })
                            return {
                              action: 'set-action-direction',
                              desc: i18n.actions.editor2.set_action_direction,
                            }
                          })
                        }}
                        icon={
                          <Icon
                            size={24}
                            icon={
                              dir === CopilotDocV1.Direction.Left
                                ? 'arrow-left'
                                : dir === CopilotDocV1.Direction.Right
                                  ? 'arrow-right'
                                  : dir === CopilotDocV1.Direction.Up
                                    ? 'arrow-up'
                                    : dir === CopilotDocV1.Direction.Down
                                      ? 'arrow-down'
                                      : 'disable'
                            }
                          />
                        }
                      />
                    ))}
                  </div>
                  <div className="ml-1 mt-1 text-xs text-gray-500">
                    {t.components.editor2.label.operation.actions.direction}
                  </div>
                </div>
              </>
            ))}
            {renderForTypes([CopilotDocV1.Type.SkillUsage], ({ action, setAction }) => {
              return (
                <>
                  <div className="grow self-stretch max-w-10 flex items-stretch justify-center">
                    <Divider className="rotate-12" />
                  </div>
                  <div className="">
                    <div className="flex items-baseline gap-1 text-xl">
                      <DetailedSelect
                        items={alternativeOperatorSkillUsages.map((item) =>
                          item.value === CopilotDocV1.SkillUsageType.ReadyToUseTimes
                            ? {
                                ...item,
                                menuItemProps: {
                                  shouldDismissPopover: false,
                                },
                                description: (
                                  <>
                                    <div>{item.description()}</div>
                                    <span className="mr-2 text-lg">x</span>
                                    <NumericInput2
                                      intOnly
                                      min={1}
                                      className="inline-flex"
                                      inputClassName="!p-0 !w-8 text-center font-semibold"
                                      value={action.skillTimes ?? 1}
                                      wheelStepSize={1}
                                      onValueChange={(v) => {
                                        edit(() => {
                                          setAction((draft) => {
                                            draft.skillTimes = v
                                          })
                                          return {
                                            action: 'set-action-skillTimes',
                                            desc: i18n.actions.editor2.set_action_skill_times,
                                            squashBy: action.id,
                                          }
                                        })
                                      }}
                                    />
                                  </>
                                ),
                              }
                            : item,
                        )}
                        value={action.skillUsage}
                        onItemSelect={(item) => {
                          if (item.value === action.skillUsage) return
                          edit(() => {
                            setAction((draft) => {
                              draft.skillUsage = item.value as number
                            })
                            return {
                              action: 'set-action-skillUsage',
                              desc: i18n.actions.editor2.set_action_skill_usage,
                            }
                          })
                        }}
                      >
                        <Button
                          minimal
                          className="-ml-1 !px-1 !py-0 !text-xl !font-normal !text-inherit"
                          text={
                            action.skillUsage
                              ? getSkillUsageAltTitle(action.skillUsage, action.skillTimes)
                              : t.components.editor2.ActionItem.select_usage
                          }
                        />
                      </DetailedSelect>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.components.editor2.label.operation.actions.skill_usage}
                    </div>
                  </div>
                </>
              )
            })}
            <div className="ml-auto flex">
              <Button
                minimal
                large
                icon="comment"
                title={t.components.editor2.ActionItem.add_doc}
                disabled={doc !== undefined}
                onClick={() => {
                  setDocDraft('')
                  shouldFocusDocInput.current = true
                }}
              />
              <Button
                minimal
                large
                icon="duplicate"
                title={t.components.editor2.ActionItem.duplicate}
                onClick={() => {
                  edit(() => {
                    dispatchActions({
                      type: 'insert',
                      value: createAction(action),
                      before: actionAtom,
                    })
                    return {
                      action: 'duplicate-action',
                      desc: i18n.actions.editor2.duplicate_action,
                    }
                  })
                }}
              />
              <Button
                minimal
                large
                icon="cross"
                title={t.components.editor2.ActionItem.delete}
                intent="danger"
                onClick={() => {
                  edit(() => {
                    dispatchActions({
                      type: 'remove',
                      atom: actionAtom,
                    })
                    return {
                      action: 'delete-action',
                      desc: i18n.actions.editor2.delete_action,
                    }
                  })
                }}
              />
            </div>
          </div>
          {renderForTypes([CopilotDocV1.Type.Swipe], ({ action, setAction }) => (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-200 px-3 py-1.5 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{t.components.editor2.label.operation.actions.duration}</span>
                <NumericInput2
                  intOnly
                  min={0}
                  buttonPosition="none"
                  inputClassName="!w-12 !p-0 !h-5 !leading-none !rounded-r-md text-center font-semibold !text-inherit"
                  placeholder="0"
                  value={action.duration ?? ''}
                  wheelStepSize={10}
                  onValueChange={(v) => {
                    edit(() => {
                      setAction((draft) => {
                        if (Number.isNaN(v)) {
                          delete draft.duration
                        } else {
                          draft.duration = v
                        }
                      })
                      return {
                        action: 'set-action-duration',
                        desc: i18n.actions.editor2.set_action_duration,
                        squashBy: action.id,
                      }
                    })
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">
                  {t.components.editor2.label.operation.actions.extra_swipe}
                </span>
                {EXTRA_SWIPE_DIRECTIONS.map(({ value, direction, icon }) => {
                  const active = (action.extraSwipe ?? 0) === value
                  return (
                    <Button
                      key={value}
                      small
                      minimal
                      className={clsx(
                        '!px-1.5 !bg-transparent [&_.bp6-icon]:!text-current',
                        active ? '!text-inherit drop-shadow' : '!text-gray-300 hover:!text-gray-400',
                      )}
                      active={active}
                      title={
                        direction ? findOperatorDirection(direction).title() : t.components.editor2.ActionItem.disabled
                      }
                      onClick={() => {
                        edit(() => {
                          setAction((draft) => {
                            // 0 是默认值（不启用），只在选择方向时写出
                            if (value === 0) {
                              delete draft.extraSwipe
                            } else {
                              draft.extraSwipe = value
                            }
                          })
                          return {
                            action: 'set-action-extraSwipe',
                            desc: i18n.actions.editor2.set_action_extra_swipe,
                            squashBy: action.id,
                          }
                        })
                      }}
                      icon={<Icon size={14} icon={icon} />}
                    />
                  )
                })}
              </div>
              {(['slopeIn', 'slopeOut'] as const).map((key) => (
                <div className="flex items-center gap-1" key={key}>
                  <span className="text-xs text-gray-500">
                    {t.components.editor2.label.operation.actions[key === 'slopeIn' ? 'slope_in' : 'slope_out']}
                  </span>
                  <NumericInput2
                    intOnly
                    min={0}
                    buttonPosition="none"
                    inputClassName="!w-10 !p-0 !h-5 !leading-none !rounded-r-md text-center font-semibold !text-inherit"
                    placeholder="10"
                    value={action[key] ?? ''}
                    wheelStepSize={1}
                    onValueChange={(v) => {
                      edit(() => {
                        setAction((draft) => {
                          if (Number.isNaN(v)) {
                            delete draft[key]
                          } else {
                            draft[key] = v
                          }
                        })
                        return {
                          action: `set-action-${key}`,
                          desc: i18n.actions.editor2[
                            key === 'slopeIn' ? 'set_action_slope_in' : 'set_action_slope_out'
                          ],
                          squashBy: action.id,
                        }
                      })
                    }}
                  />
                </div>
              ))}
              <Switch
                className="!mb-0"
                labelElement={
                  <span className="text-xs font-normal">{t.components.editor2.label.operation.actions.with_pause}</span>
                }
                checked={action.withPause ?? false}
                onChange={(e) => {
                  edit(() => {
                    setAction((draft) => {
                      if (e.target.checked) {
                        draft.withPause = true
                      } else {
                        delete draft.withPause
                      }
                    })
                    return {
                      action: 'set-action-withPause',
                      desc: i18n.actions.editor2.set_action_with_pause,
                      squashBy: action.id,
                    }
                  })
                }}
              />
              <Switch
                className="!mb-0"
                labelElement={
                  <span className="text-xs font-normal">
                    {t.components.editor2.label.operation.actions.high_resolution_swipe_fix}
                    <Tooltip
                      className="!inline-block !mt-0"
                      interactionKind={PopoverInteractionKind.HOVER}
                      content={t.components.editor2.label.operation.actions.high_resolution_swipe_fix_tip}
                    >
                      <Icon className="ml-1 cursor-help" icon="help" />
                    </Tooltip>
                  </span>
                }
                checked={action.highResolutionSwipeFix ?? false}
                onChange={(e) => {
                  edit(() => {
                    setAction((draft) => {
                      if (e.target.checked) {
                        draft.highResolutionSwipeFix = true
                      } else {
                        delete draft.highResolutionSwipeFix
                      }
                    })
                    return {
                      action: 'set-action-highResolutionSwipeFix',
                      desc: i18n.actions.editor2.set_action_high_resolution_swipe_fix,
                      squashBy: action.id,
                    }
                  })
                }}
              />
            </div>
          ))}
          {(doc !== undefined || action.docColor !== undefined) && (
            <div data-doc-section className="flex items-center bg-gray-200 text-gray-500">
              <Select
                filterable={false}
                items={actionDocColors}
                itemRenderer={(color, { index, handleClick, handleFocus, modifiers }) => (
                  <MenuItem
                    key={color.value}
                    className={modifiers.active ? Classes.ACTIVE : undefined}
                    style={{ color: color.value }}
                    onClick={handleClick}
                    onFocus={handleFocus}
                    text={
                      <div className="flex items-center gap-2">
                        <Icon icon="full-circle" />
                        {color.title()}
                      </div>
                    }
                    selected={action.docColor !== undefined ? action.docColor === color.value : index === 0}
                  />
                )}
                onItemSelect={(item) => {
                  edit(() => {
                    setAction((draft) => {
                      draft.docColor = item.value
                    })
                    return {
                      action: 'set-action-docColor',
                      desc: i18n.actions.editor2.set_action_doc_color,
                    }
                  })
                }}
              >
                <Button minimal className="relative !p-1">
                  <Icon icon="comment" className="!mr-0" />
                  <span
                    className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: action.docColor ?? actionDocColors[0].value,
                    }}
                  />
                </Button>
              </Select>
              <InputGroup
                className="grow"
                inputClassName="!px-1 !bg-transparent focus:!bg-gray-100 !border-0 !rounded-none !shadow-none text-xs"
                style={{
                  color: action.docColor ?? actionDocColors[0].value,
                }}
                inputRef={setDocInput}
                placeholder={t.components.editor2.ActionItem.doc_placeholder}
                value={doc ?? ''}
                onChange={(e) => {
                  edit(() => {
                    setAction((draft) => {
                      draft.doc = e.target.value
                    })
                    return {
                      action: 'set-action-doc',
                      desc: i18n.actions.editor2.set_action_doc,
                      squashBy: action.id,
                    }
                  })
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    // 如果点击了 data-doc-section 以外的地方，且输入框为空，则删除 doc 和 docColor
                    if (!e.relatedTarget?.closest('[data-doc-section]')) {
                      setDocDraft(undefined)

                      edit(() => {
                        setAction((draft) => {
                          delete draft.doc
                          delete draft.docColor
                        })
                        return {
                          // 这里的 action 要和正常修改时的 action 一致，因为如果用户手动清空输入框的话已经有了一条记录，
                          // 这里不一致的话还会多出一条额外的记录
                          action: 'set-action-doc',
                          desc: i18n.actions.editor2.delete_action_doc,
                          squashBy: action.id,
                        }
                      })
                    }
                  } else {
                    edit()
                  }
                }}
              />
            </div>
          )}
          {errors && (
            <Callout icon={null} intent="danger" className="!p-2 !rounded-none text-xs">
              {errors.map(({ path, message, fieldLabel }) => (
                <p key={path.join()}>
                  {fieldLabel && fieldLabel + ': '}
                  {message}
                </p>
              ))}
            </Callout>
          )}
        </Card>
      </div>
    )
  },
)
ActionItem.displayName = 'ActionItem'

const groupNamesAtom = selectAtom(
  editorAtoms.groups,
  (groups) => groups.map((g) => g.name),
  (a, b) => a.join() === b.join(),
)

const ActionTarget: FC<{
  actionAtom: PrimitiveAtom<
    Extract<
      EditorAction,
      {
        type:
          | CopilotDocV1.Type.Deploy
          | CopilotDocV1.Type.Retreat
          | CopilotDocV1.Type.Skill
          | CopilotDocV1.Type.SkillUsage
          | CopilotDocV1.Type.BulletTime
          | CopilotDocV1.Type.SetUnitLocation
      }
    >
  >
}> = ({ actionAtom }) => {
  const language = useAtomValue(languageAtom)
  const t = useTranslation()
  const edit = useEdit()
  const [{ name }, setAction] = useAtom(actionAtom)
  const groupNames = useAtomValue(groupNamesAtom)

  const isGroup = (name?: string) => name !== undefined && groupNames.includes(name)

  let displayName: string | undefined
  let subtitle = '<<<'

  if (name !== undefined) {
    if (isGroup(name)) {
      displayName = name || t.components.editor2.ActionItem.unnamed_group
      subtitle = t.components.editor2.label.operation.groups._item
    } else {
      displayName = getLocalizedOperatorName(name, language)

      const operatorInfo = findOperatorByName(name)
      subtitle = operatorInfo
        ? operatorInfo.prof === 'TOKEN'
          ? t.components.editor2.ActionItem.token
          : t.components.editor2.label.opers._item
        : // 自定义干员、关卡里的道具之类
          t.components.editor2.ActionItem.unknown_target
    }
  }

  return (
    <OperatorSelect
      liftPicked
      className="shrink-0"
      value={name}
      onSelect={(name) => {
        edit(() => {
          setAction((prev) => ({ ...prev, name }))
          return {
            action: 'set-action-name',
            desc: i18n.actions.editor2.set_action_target,
          }
        })
      }}
    >
      <Button minimal className="my-1 !p-0 !border-0">
        <div className="flex items-center">
          <OperatorAvatar
            className="w-16 h-16"
            name={isGroup(name) ? undefined : name}
            fallback={isGroup(name) ? <Icon icon="people" size={32} /> : name}
            sourceSize={96}
          />
          <div className="ml-1 w-[6.5em]">
            <div
              className={clsx('leading-4 tracking-tighter', displayName && displayName?.length > 6 && 'text-xs')}
              title={displayName}
            >
              {displayName === undefined ? (
                <span className="text-gray-500">{t.components.editor2.ActionItem.select_target}</span>
              ) : (
                displayName
              )}
            </div>
            <Divider className="m-0 mr-1" />
            <div className="text-gray-500 text-xs font-normal truncate">{subtitle}</div>
          </div>
        </div>
      </Button>
    </OperatorSelect>
  )
}

type PartialRect = [number | undefined, number | undefined, number | undefined, number | undefined]

// 720p 基准像素矩形 [x, y, w, h] 的逐位输入，字号继承父容器。
// 清空输入时 NumericInput2 回调 NaN，转成 undefined；全部清空时把整个字段置空以便 ｢未填｣ 与 ｢已填｣ 可区分
const RectInput: FC<{
  value: PartialRect | undefined
  onChange: (value: PartialRect | undefined) => void
}> = ({ value, onChange }) => (
  <>
    {[0, 1, 2, 3].map((index, i) => (
      <Fragment key={index}>
        {i > 0 && <span className="mt-1 -ml-px mr-px text-gray-300 dark:text-gray-600 text-xl font-serif">,</span>}
        <NumericInput2
          intOnly
          buttonPosition="none"
          inputClassName="!min-w-[2ch] mx-px mt-1 !p-0 !leading-3 hover:!bg-gray-100 focus:!bg-gray-100 dark:hover:!bg-gray-600 dark:focus:!bg-gray-600 !border-0 !rounded [&:not(:focus)]:!shadow-none !text-inherit font-semibold text-center"
          style={{ width: String(value?.[index] ?? 0).length + 'ch' }}
          value={value?.[index] ?? ''}
          wheelStepSize={1}
          onValueChange={(v) => {
            const next: PartialRect = [value?.[0], value?.[1], value?.[2], value?.[3]]
            next[index] = Number.isNaN(v) ? undefined : v
            onChange(next.every((x) => x === undefined) ? undefined : next)
          }}
        />
      </Fragment>
    ))}
  </>
)
