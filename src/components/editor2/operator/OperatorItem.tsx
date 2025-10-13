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
    const discList = useMemo(() => (info as any)?.discs ?? [], [info])

    const discColorClasses = (color?: string) => {
      switch (color) {
        case '金':
          return '!bg-yellow-100 dark:!bg-yellow-900 dark:!text-yellow-200 !text-yellow-800'
        case '紫':
          return '!bg-purple-100 dark:!bg-purple-900 dark:!text-purple-200 !text-purple-800'
        case '蓝':
          return '!bg-blue-100 dark:!bg-blue-900 dark:!text-blue-200 !text-blue-800'
        case '橙':
          return '!bg-orange-100 dark:!bg-orange-900 dark:!text-orange-200 !text-orange-800'
        default:
          return '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50'
      }
    }

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
          <div className="ml-2 mt-0.5 select-none shrink-0">
            <ul className="w-[23ch] grid grid-rows-4 gap-1 ml-1 mt-1">
              {/* 如果有命盘定义，则以命盘集合驱动 skill 选择；否则回退为原来的 1/2/3 技能选择 */}
              {discList.length > 0
                ? (
                    [0, 1, 2].map((slot) => {
                      const indices = operator.discsSelected ?? []
                      const idx1 = indices[slot] ?? 0
                      const selectedItem = idx1 > 0 ? discList[idx1 - 1] : undefined
                      const selectedIsAny = idx1 === -1
                      return (
                        <li key={'disc-slot-' + slot} className="relative h-8 flex gap-1">
                          <Select
                            className=""
                            filterable={false}
                            items={[{ name: '任意', abbreviation: '任意', desp: '任意', idx: -1 } as any, ...discList.map((d, idx) => ({ ...d, idx }))]}
                            itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
                              <MenuItem
                                roleStructure="listoption"
                                key={item.idx}
                                className={clsx(
                                  'min-w-40 !rounded-none text-sm font-serif text-slate-700 dark:text-slate-200',
                                  modifiers.active && Classes.ACTIVE,
                                )}
                                text={(item.abbreviation || item.name) + (item.color ? ` · ${item.color}` : '')}
                                title={item.desp}
                                onClick={handleClick}
                                onFocus={handleFocus}
                                selected={item.idx === -1 ? idx1 === -1 : item.idx + 1 === idx1}
                              />
                            )}
                            onItemSelect={(item) => {
                              edit(() => {
                                const chosen = (item as any).idx === -1 ? -1 : (item as any).idx + 1
                                const nextIndices = [...(operator.discsSelected ?? [0, 0, 0])]
                                // 保证长度为3
                                while (nextIndices.length < 3) nextIndices.push(0)
                                // 去重：其他槽若已选相同命盘则清空
                                if (chosen > 0) {
                                  for (let i = 0; i < nextIndices.length; i++) {
                                    if (i !== slot && nextIndices[i] === chosen) {
                                      nextIndices[i] = 0
                                    }
                                  }
                                }
                                nextIndices[slot] = chosen
                                const next: EditorOperator = {
                                  ...operator,
                                  discsSelected: nextIndices,
                                }
                                onChange?.(next)
                                return {
                                  action: 'set-operator-skill',
                                  desc: i18n.actions.editor2.set_operator_skill,
                                  squashBy: operator.id,
                                }
                              })
                            }}
                            popoverProps={{
                              placement: 'top',
                              popoverClassName:
                                '!rounded-none [&_.bp4-popover2-content]:!p-0 [&_.bp4-menu]:min-w-40 [&_li]:!mb-0',
                            }}
                          >
                            <Button
                              small
                              minimal
                              title={selectedItem ? selectedItem.desp : selectedIsAny ? '任意' : `选择命盘${slot + 1}`}
                              className={clsx(
                                'w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current',
                                selectedItem
                                  ? discColorClasses(selectedItem.color)
                                  : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
                              )}
                            >
                              {selectedItem
                                ? (selectedItem.abbreviation || selectedItem.name)
                                : selectedIsAny
                                ? '任意'
                                : `命盘${slot + 1}`}
                            </Button>
                          </Select>

                          {/* 星石选择 */}
                          <Select
                            className=""
                            filterable={false}
                            items={[
                              '任意',
                              '天府','天相','巨门','太阳','廉贞','太阴','紫微','七杀','天机','武曲','破军','天同','天梁','贪狼',
                            ]}
                            itemRenderer={(item: string, { handleClick, handleFocus, modifiers }) => (
                              <MenuItem
                                roleStructure="listoption"
                                key={item}
                                className={clsx(
                                  'min-w-20 !rounded-none text-sm font-serif text-slate-700 dark:text-slate-200',
                                  modifiers.active && Classes.ACTIVE,
                                )}
                                text={item}
                                title={item}
                                onClick={handleClick}
                                onFocus={handleFocus}
                                selected={(operator as any).discStarStones?.[slot] === item}
                              />
                            )}
                            onItemSelect={(item: string) => {
                              edit(() => {
                                const stones = [...((operator as any).discStarStones ?? ['','',''])]
                                while (stones.length < 3) stones.push('')
                                stones[slot] = item
                                const next: EditorOperator = {
                                  ...operator,
                                  discStarStones: stones,
                                }
                                onChange?.(next)
                                return {
                                  action: 'set-operator-discStarStone',
                                  desc: '选择命盘星石',
                                  squashBy: operator.id,
                                }
                              })
                            }}
                            popoverProps={{
                              placement: 'top',
                              popoverClassName:
                                '!rounded-none [&_.bp4-popover2-content]:!p-0 [&_.bp4-menu]:min-w-20 [&_li]:!mb-0',
                            }}
                          >
                            <Button
                              small
                              minimal
                              title={(operator as any).discStarStones?.[slot] || '选择星石'}
                              className={'w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600'}
                            >
                              {(operator as any).discStarStones?.[slot] || '星石'}
                            </Button>
                          </Select>

                          {/* 辅星选择 */}
                          <Select
                            className=""
                            filterable={false}
                            items={[
                              '任意',
                              '红鸾','阴煞','天魁','八座','陀螺','地劫','解神','禄存','文曲','天钺','火星','文昌','天巫','左辅','铃星','恩光','三台','擎羊','天贵','天姚','天马','天刑','右弼','地空',
                            ]}
                            itemRenderer={(item: string, { handleClick, handleFocus, modifiers }) => (
                              <MenuItem
                                roleStructure="listoption"
                                key={item}
                                className={clsx(
                                  'min-w-20 !rounded-none text-sm font-serif text-slate-700 dark:text-slate-200',
                                  modifiers.active && Classes.ACTIVE,
                                )}
                                text={item}
                                title={item}
                                onClick={handleClick}
                                onFocus={handleFocus}
                                selected={(operator as any).discAssistStars?.[slot] === item}
                              />
                            )}
                            onItemSelect={(item: string) => {
                              edit(() => {
                                const assists = [...((operator as any).discAssistStars ?? ['','',''])]
                                while (assists.length < 3) assists.push('')
                                assists[slot] = item
                                const next: EditorOperator = {
                                  ...operator,
                                  discAssistStars: assists,
                                }
                                onChange?.(next)
                                return {
                                  action: 'set-operator-discAssistStar',
                                  desc: '选择命盘辅星',
                                  squashBy: operator.id,
                                }
                              })
                            }}
                            popoverProps={{
                              placement: 'top',
                              popoverClassName:
                                '!rounded-none [&_.bp4-popover2-content]:!p-0 [&_.bp4-menu]:min-w-20 [&_li]:!mb-0',
                            }}
                          >
                            <Button
                              small
                              minimal
                              title={(operator as any).discAssistStars?.[slot] || '选择辅星'}
                              className={'w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600'}
                            >
                              {(operator as any).discAssistStars?.[slot] || '辅星'}
                            </Button>
                          </Select>
                        </li>
                      )
                    })
                  )
                : controlsEnabled &&
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
