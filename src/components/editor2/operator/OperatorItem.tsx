import { Button, Card, Classes, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import { FC, memo, useMemo, useState } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import {
  OPERATORS,
  useLocalizedOperatorName,
  getSkillCount,
  withDefaultRequirements,
  getDefaultRequirements,
  getModuleName,
} from '../../../models/operator'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { clamp } from 'lodash-es'
import { OperatorAvatar } from '../../OperatorAvatar'
import { MasteryIcon } from '../../MasteryIcon'
import { Select } from '../../Select'
import { NumericInput2 } from '../../editor/NumericInput2'
import { AppToaster } from '../../Toaster'
import { SortableItemProps } from '../../dnd'
import { EditorOperator, useEdit } from '../editor-state'
import { editorFavOperatorsAtom } from '../reconciliation'

interface OperatorItemProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  onOverlay?: boolean
  onChange?: (operator: EditorOperator) => void
  onRemove?: () => void
}

export const OperatorItem: FC<OperatorItemProps> = memo(
  ({ operator, onRemove, onChange, isDragging, attributes, listeners }) => {
    const t = useTranslation()
    const displayName = useLocalizedOperatorName(operator.name)
    const setFavOperators = useSetAtom(editorFavOperatorsAtom)
    const info = OPERATORS.find(({ name }) => name === operator.name)
    const edit = useEdit()

    const controlsEnabled = true
    const requirements = useMemo(
      () => withDefaultRequirements(operator.requirements, info?.rarity),
      [operator.requirements, info?.rarity],
    )
    const skillCount = useMemo(() => (info ? getSkillCount(info) : 0), [info])
    const [skillLevels, setSkillLevels] = useState<Record<number, number>>({})

    return (
      <div
        className={clsx('relative flex items-start', isDragging && 'invisible')}
      >
        <div className="relative">
          <Popover2
            // 维持全屏灰幕时，确保弹层通过 Portal 且层级高于遮罩
            usePortal={true}
            popoverClassName="z-[1600]"
            portalClassName="z-[1600]"
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
        </div>

        {/* Skills & Module controls */}
        {info && (
          <div className="ml-2 mt-0.5 select-none">
            <ul className="w-8 grid grid-rows-4 gap-1 ml-1 mt-1">
              {controlsEnabled &&
                Array.from({ length: skillCount }, (_, index) => {
                  const available = index <= (requirements.elite ?? 0)
                  const skillNumber = index + 1
                  const selected = operator.skill === skillNumber
                  const maxSkillLevel = (requirements.elite ?? 0) === 2 ? 10 : 7
                  const skillLevel = selected
                    ? requirements.skillLevel ??
                      getDefaultRequirements(info?.rarity).skillLevel
                    : skillLevels[skillNumber] ??
                      getDefaultRequirements(info?.rarity).skillLevel

                  const selectSkill = () => {
                    if (operator.skill !== skillNumber) {
                      edit(() => {
                        ;(operator as EditorOperator) // narrow type for editor
                        const next: EditorOperator = {
                          ...operator,
                          skill: skillNumber,
                          requirements: {
                            ...operator.requirements,
                            // override with the current skill level
                            skillLevel,
                          },
                        }
                        // 触发上层 onChange 以持久化
                        onChange?.(next)
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
                        value={skillLevel <= 7 ? skillLevel : ''}
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
                            let newLevel = Number(valueStr)
                            if (!Number.isFinite(newLevel)) return {
                              action: 'skip',
                              desc: 'Skip checkpoint',
                            }
                            if (newLevel === 0) newLevel = 10
                            newLevel = clamp(newLevel, 1, maxSkillLevel)

                            setSkillLevels((prev) => ({
                              ...prev,
                              [skillNumber]: newLevel,
                            }))
                            const next: EditorOperator = {
                              ...operator,
                              requirements: {
                                ...operator.requirements,
                                skillLevel: newLevel,
                              },
                            }
                            onChange?.(next)
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
                              (requirements.skillLevel ??
                                getDefaultRequirements(info?.rarity).skillLevel) +
                                (e.deltaY > 0 ? -1 : 1),
                              1,
                              maxSkillLevel,
                            )
                            setSkillLevels((prev) => ({
                              ...prev,
                              [skillNumber]: newLevel,
                            }))
                            const next: EditorOperator = {
                              ...operator,
                              requirements: {
                                ...operator.requirements,
                                skillLevel: newLevel,
                              },
                            }
                            onChange?.(next)
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

              {/* Row 4: Module selector */}
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
                  itemRenderer={(value, { handleClick, handleFocus, modifiers }) => (
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
                        count: value as number,
                        name: getModuleName(value as CopilotDocV1.Module),
                      })}
                      onClick={handleClick}
                      onFocus={handleFocus}
                      selected={value === requirements.module}
                    />
                  )}
                  onItemSelect={(value) => {
                    edit(() => {
                      const next: EditorOperator = {
                        ...operator,
                        requirements: {
                          ...operator.requirements,
                          module: value as CopilotDocV1.Module,
                        },
                      }
                      onChange?.(next)
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
                        count: requirements.module ?? CopilotDocV1.Module.Default,
                        name: getModuleName(
                          (requirements.module ?? CopilotDocV1.Module.Default) as CopilotDocV1.Module,
                        ),
                      })
                    }
                    className={clsx(
                      'w-4 h-4 !p-0 flex items-center justify-center font-serif !font-bold !text-base !rounded-none !border-2 !border-current',
                      (requirements.module ?? CopilotDocV1.Module.Default) !==
                        CopilotDocV1.Module.Default
                        ? '!bg-purple-100 dark:!bg-purple-900 dark:!text-purple-200 !text-purple-800'
                        : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
                    )}
                  />
                </Select>
              )}
            </ul>
          </div>
        )}
      </div>
    )
  },
)
OperatorItem.displayName = 'OperatorItem'
