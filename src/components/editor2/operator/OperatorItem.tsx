import { Button, Card, Classes, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtom, useSetAtom } from 'jotai'
import { clamp } from 'lodash-es'
import { FC, memo } from 'react'

import { CopilotDocV1 } from 'models/copilot.schema'

import { i18n, useTranslation } from '../../../i18n/i18n'
import {
  OPERATORS,
  adjustOperatorLevel,
  alternativeOperatorSkillUsages,
  getDefaultRequirements,
  getEliteIconUrl,
  getModuleName,
  getSkillCount,
  getSkillUsageAltTitle,
  useLocalizedOperatorName,
  withDefaultRequirements,
} from '../../../models/operator'
import { MasteryIcon } from '../../MasteryIcon'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { AppToaster } from '../../Toaster'
import { SortableItemProps } from '../../dnd'
import { DetailedSelect } from '../../editor/DetailedSelect'
import { NumericInput2 } from '../../editor/NumericInput2'
import { EditorOperator, editorAtoms, useEdit } from '../editor-state'
import { editorFavOperatorsAtom } from '../reconciliation'

interface OperatorItemProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  onOverlay?: boolean
  onChange?: (operator: EditorOperator) => void
  onRemove?: () => void
}

const skillUsageClasses: Record<CopilotDocV1.SkillUsageType, string> = {
  0: '!text-slate-500 dark:!text-slate-400',
  1: '!text-emerald-500',
  2: '!text-indigo-500',
  3: '!text-rose-500',
}

export const OperatorItem: FC<OperatorItemProps> = memo(
  ({
    operator,
    onChange,
    onRemove,
    onOverlay,
    isDragging,
    isSorting,
    attributes,
    listeners,
  }) => {
    const t = useTranslation()
    const edit = useEdit()
    const displayName = useLocalizedOperatorName(operator.name)
    const [skillLevels, setSkillLevels] = useAtom(
      editorAtoms.skillLevelOverrides(operator.id),
    )
    const setFavOperators = useSetAtom(editorFavOperatorsAtom)
    const info = OPERATORS.find(({ name }) => name === operator.name)
    const skillCount = info ? getSkillCount(info) : 3
    const requirements = withDefaultRequirements(
      operator.requirements,
      info?.rarity,
    )
    const controlsEnabled = !onOverlay && !isDragging && !isSorting

    return (
      <div
        className={clsx('relative flex items-start', isDragging && 'invisible')}
      >
        <div className="relative">
          <Popover2
            placement="top"
            content={
              <Menu>
                <MenuItem
                  icon="star"
                  text={t.components.editor2.OperatorItem.add_to_favorites}
                  onClick={() => {
                    setFavOperators((prev) => [...prev, operator])
                    AppToaster.show({
                      message:
                        t.components.editor2.OperatorItem.added_to_favorites,
                      intent: 'success',
                    })
                  }}
                />
                <MenuItem
                  icon="trash"
                  text={t.common.delete}
                  intent="danger"
                  onClick={onRemove}
                />
              </Menu>
            }
          >
            <Card
              interactive
              className="card-shadow-subtle relative w-24 p-0 !py-0 flex flex-col overflow-hidden select-none pointer-events-auto"
              {...attributes}
              {...listeners}
            >
              <OperatorAvatar
                id={info?.id}
                rarity={info?.rarity}
                className="w-24 h-24 rounded-b-none"
                fallback={displayName}
                sourceSize={96}
              />
              <h4
                className={clsx(
                  'm-1 leading-4 font-semibold tracking-tighter pointer-events-none',
                  displayName.length >= 12 && 'text-xs',
                )}
              >
                {displayName}
              </h4>
              {info && info.prof !== 'TOKEN' && (
                <img
                  className="absolute top-0 right-0 w-5 h-5 p-px bg-gray-600 pointer-events-none"
                  src={'/assets/prof-icons/' + info.prof + '.png'}
                  alt={info.prof}
                />
              )}
            </Card>
          </Popover2>

          {info?.prof !== 'TOKEN' && (
            <>
              <div className="absolute top-2 -left-5 ml-[2px] px-3 py-4 rounded-full bg-[radial-gradient(rgba(0,0,0,0.6)_10%,rgba(0,0,0,0.08)_35%,rgba(0,0,0,0)_50%)] pointer-events-none">
                <Button
                  small
                  minimal
                  className="!p-0 !border-0 pointer-events-auto hover:opacity-80"
                  onClick={() => {
                    edit(() => {
                      onChange?.({
                        ...operator,
                        requirements: {
                          ...operator.requirements,
                          elite: (requirements.elite - 1 + 3) % 3,
                        },
                      })
                      return {
                        action: 'set-operator-level',
                        desc: i18n.actions.editor2.set_operator_level,
                        squashBy: operator.id,
                      }
                    })
                  }}
                >
                  <img
                    className="w-8 h-7 object-contain"
                    src={getEliteIconUrl(requirements.elite)}
                    alt={t.components.editor2.OperatorItem.elite({
                      level: requirements.elite,
                    })}
                  />
                </Button>
              </div>
              <div className="absolute -top-2 -left-2 flex flex-col items-center">
                <NumericInput2
                  intOnly
                  min={1}
                  buttonPosition="none"
                  value={requirements.level}
                  inputClassName="!w-9 h-9 !p-0 !leading-9 !rounded-full !border-2 !border-yellow-300 !bg-black/50 text-lg text-white font-semibold text-center !shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  onValueChange={(value) => {
                    edit(() => {
                      onChange?.({
                        ...operator,
                        requirements: {
                          ...operator.requirements,
                          level: value,
                        },
                      })
                      return {
                        action: 'set-operator-level',
                        desc: i18n.actions.editor2.set_operator_level,
                        squashBy: operator.id,
                      }
                    })
                  }}
                  onWheelFocused={(e) => {
                    e.preventDefault()
                    edit(() => {
                      onChange?.({
                        ...operator,
                        requirements: {
                          ...operator.requirements,
                          ...adjustOperatorLevel({
                            rarity: info?.rarity,
                            level: requirements.level,
                            elite: requirements.elite,
                            delta: e.deltaY > 0 ? -10 : 10,
                          }),
                        },
                      })
                      return {
                        action: 'set-operator-level',
                        desc: i18n.actions.editor2.set_operator_level,
                        squashBy: operator.id,
                      }
                    })
                  }}
                />
              </div>
            </>
          )}
          <div className="flex h-6">
            {controlsEnabled && (
              <DetailedSelect
                items={[
                  {
                    type: 'header' as const,
                    header: t.components.editor2.label.opers.skill_usage,
                  },
                  ...alternativeOperatorSkillUsages,
                ].map((item) =>
                  item.type === 'choice' &&
                  item.value === CopilotDocV1.SkillUsageType.ReadyToUseTimes
                    ? {
                        ...item,
                        menuItemProps: { shouldDismissPopover: false },
                        description: (
                          <>
                            <div>
                              {typeof item.description === 'function'
                                ? item.description()
                                : item.description}
                            </div>
                            <span className="mr-2 text-lg">x</span>
                            <NumericInput2
                              intOnly
                              min={1}
                              className="inline-flex"
                              inputClassName="!p-0 !w-8 text-center font-semibold"
                              value={operator.skillTimes ?? 1}
                              wheelStepSize={1}
                              onValueChange={(v) => {
                                edit(() => {
                                  onChange?.({
                                    ...operator,
                                    skillTimes: v,
                                  })
                                  return {
                                    action: 'set-operator-skillTimes',
                                    desc: i18n.actions.editor2
                                      .set_operator_skill_count,
                                    squashBy: operator.id,
                                  }
                                })
                              }}
                            />
                          </>
                        ),
                      }
                    : item,
                )}
                value={operator.skillUsage ?? CopilotDocV1.SkillUsageType.None}
                onItemSelect={(item) => {
                  if (item.value === operator.skillUsage) return
                  edit(() => {
                    onChange?.({
                      ...operator,
                      skillUsage: item.value as number,
                    })
                    return {
                      action: 'set-operator-skillUsage',
                      desc: i18n.actions.editor2.set_operator_skill_usage,
                    }
                  })
                }}
              >
                <Button
                  small
                  minimal
                  className={clsx(
                    '!px-0 h-full !border-none !text-[.7rem] !leading-3 !font-normal !underline underline-offset-2',
                    skillUsageClasses[
                      operator.skillUsage ?? CopilotDocV1.SkillUsageType.None
                    ],
                  )}
                >
                  {getSkillUsageAltTitle(
                    operator.skillUsage ?? CopilotDocV1.SkillUsageType.None,
                    operator.skillTimes ?? 1,
                  )}
                </Button>
              </DetailedSelect>
            )}
          </div>
        </div>

        <ul className="w-8 grid grid-rows-4 gap-1 ml-1 mt-1">
          {controlsEnabled &&
            Array.from({ length: skillCount }, (_, index) => {
              const available = index <= requirements.elite
              const skillNumber = index + 1
              const selected = operator.skill === skillNumber
              const maxSkillLevel = requirements.elite === 2 ? 10 : 7
              const skillLevel = selected
                ? requirements.skillLevel
                : skillLevels[skillNumber] ??
                  getDefaultRequirements(info?.rarity).skillLevel

              const selectSkill = () => {
                if (operator.skill !== skillNumber) {
                  edit(() => {
                    onChange?.({
                      ...operator,
                      skill: skillNumber,
                      requirements: {
                        ...operator.requirements,
                        // override with the current skill level
                        skillLevel,
                      },
                    })
                    return {
                      action: 'set-operator-skill',
                      desc: i18n.actions.editor2.set_operator_skill,
                    }
                  })
                }
              }

              return (
                <li
                  key={index}
                  className={clsx(
                    'relative',
                    selected
                      ? available
                        ? '!bg-purple-100 dark:!bg-purple-900 dark:text-purple-200 text-purple-800'
                        : '!bg-red-100 dark:!bg-red-900 dark:text-red-200 text-red-800'
                      : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
                  )}
                >
                  <NumericInput2
                    intOnly
                    title={
                      available
                        ? t.models.operator.skill_number({ count: skillNumber })
                        : t.components.editor2.OperatorItem.skill_not_available
                    }
                    min={0}
                    buttonPosition="none"
                    value={skillLevel <= 7 ? skillLevel : ''} // 大于 7 级时置空然后用 padding 占位，以留出空间在上面放置专精图标
                    inputClassName={clsx(
                      '!w-8 h-8 !p-0 !leading-8 !bg-transparent text-center font-bold text-xl !text-inherit !rounded-none !border-2 !border-current [&:not(:focus)]:cursor-pointer',
                      skillLevel > 7 && '!pl-4',
                    )}
                    onClick={selectSkill}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectSkill()
                      }
                    }}
                    onValueChange={(_, valueStr) => {
                      edit(() => {
                        // 拿到新输入的一位数字（比如原来是 5，输入 2，变成 52，这里会拿到 2）
                        let newLevel =
                          valueStr.length > 1
                            ? +String(valueStr).replace(String(skillLevel), '')
                            : Number(valueStr)

                        if (newLevel === 0) {
                          newLevel = 10
                        }
                        newLevel = clamp(newLevel, 1, maxSkillLevel)

                        setSkillLevels((prev) => ({
                          ...prev,
                          [skillNumber]: newLevel,
                        }))
                        onChange?.({
                          ...operator,
                          requirements: {
                            ...operator.requirements,
                            skillLevel: newLevel,
                          },
                        })
                        return {
                          action: 'set-operator-skillLevel',
                          desc: i18n.actions.editor2.set_operator_skill_level,
                          squashBy: operator.id,
                        }
                      })
                    }}
                    onWheelFocused={(e) => {
                      e.preventDefault()
                      edit(() => {
                        const newLevel = clamp(
                          requirements.skillLevel + (e.deltaY > 0 ? -1 : 1),
                          1,
                          maxSkillLevel,
                        )
                        setSkillLevels((prev) => ({
                          ...prev,
                          [skillNumber]: newLevel,
                        }))
                        onChange?.({
                          ...operator,
                          requirements: {
                            ...operator.requirements,
                            skillLevel: newLevel,
                          },
                        })
                        return {
                          action: 'set-operator-skillLevel',
                          desc: i18n.actions.editor2.set_operator_skill_level,
                          squashBy: operator.id,
                        }
                      })
                    }}
                  />
                  {skillLevel > 7 && (
                    <MasteryIcon
                      className="absolute top-0 left-0 w-full h-full p-2 pointer-events-none"
                      mastery={skillLevel - 7}
                    />
                  )}
                  {!available && (
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-current rotate-45 -translate-y-px pointer-events-none" />
                  )}
                </li>
              )
            })}
          {controlsEnabled && info?.modules && (
            <Select
              className="row-start-4"
              filterable={false}
              items={[
                CopilotDocV1.Module.Default,
                ...info.modules
                  .map((m) =>
                    m
                      ? (CopilotDocV1.Module[m] as
                          | CopilotDocV1.Module
                          | undefined)
                      : CopilotDocV1.Module.Original,
                  )
                  .filter((m) => m !== undefined),
              ]}
              itemRenderer={(
                value,
                { handleClick, handleFocus, modifiers },
              ) => (
                <MenuItem
                  roleStructure="listoption"
                  key={value}
                  className={clsx(
                    'min-w-12 !rounded-none text-base font-serif font-bold text-center text-slate-600 dark:text-slate-300',
                    modifiers.active && Classes.ACTIVE,
                  )}
                  text={
                    value === CopilotDocV1.Module.Default ? (
                      <Icon icon="disable" />
                    ) : value === CopilotDocV1.Module.Original ? (
                      <Icon icon="small-square" />
                    ) : (
                      getModuleName(value)
                    )
                  }
                  title={t.components.editor2.OperatorItem.module_title({
                    count: value,
                    name: getModuleName(value),
                  })}
                  onClick={handleClick}
                  onFocus={handleFocus}
                  selected={value === requirements.module}
                />
              )}
              onItemSelect={(value) => {
                edit(() => {
                  onChange?.({
                    ...operator,
                    requirements: {
                      ...operator.requirements,
                      module: value,
                    },
                  })
                  return {
                    action: 'set-operator-module',
                    desc: i18n.actions.editor2.set_operator_module,
                    squashBy: operator.id,
                  }
                })
              }}
              popoverProps={{
                placement: 'top',
                popoverClassName:
                  '!rounded-none [&_.bp4-popover2-content]:!p-0 [&_.bp4-menu]:min-w-0 [&_li]:!mb-0',
              }}
            >
              <Button
                small
                minimal
                title={
                  t.components.editor2.OperatorItem.module +
                  ': ' +
                  t.components.editor2.OperatorItem.module_title({
                    count: requirements.module,
                    name: getModuleName(requirements.module),
                  })
                }
                className={clsx(
                  'w-4 h-4 !p-0 flex items-center justify-center font-serif !font-bold !text-base !rounded-none !border-2 !border-current',
                  requirements.module !== CopilotDocV1.Module.Default
                    ? '!bg-purple-100 dark:!bg-purple-900 dark:!text-purple-200 !text-purple-800'
                    : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
                )}
              >
                {requirements.module ===
                CopilotDocV1.Module.Default ? null : requirements.module ===
                  CopilotDocV1.Module.Original ? (
                  <Icon icon="small-square" />
                ) : (
                  getModuleName(requirements.module)
                )}
              </Button>
            </Select>
          )}
        </ul>
      </div>
    )
  },
)
OperatorItem.displayName = 'OperatorItem'
