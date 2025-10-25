import { Button, Card, Classes, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import { clamp } from 'lodash-es'
import { FC, memo, useMemo, useState } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import {
  findOperatorByName,
  getDefaultRequirements,
  getModuleName,
  getSkillCount,
  useLocalizedOperatorName,
  withDefaultRequirements,
} from '../../../models/operator'
import { MasteryIcon } from '../../MasteryIcon'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { AppToaster } from '../../Toaster'
import { SortableItemProps } from '../../dnd'
import { NumericInput2 } from '../../editor/NumericInput2'
import { EditorOperator, useEdit } from '../editor-state'
import { editorFavOperatorsAtom } from '../reconciliation'

// —— 属性拓展（extensions）统一读写 ——
type DiscSlot = {
  index: number
  disc: number
  starStone?: string
  assistStar?: string
}

function getDiscSlots(operator: EditorOperator): DiscSlot[] {
  // 原方案优先：使用并行数组（camelCase）
  const ds = operator.discsSelected ?? []
  const ss = (operator as any).discStarStones ?? []
  const as = (operator as any).discAssistStars ?? []
  const hasLegacy = ds.length > 0 || ss.length > 0 || as.length > 0
  if (hasLegacy) {
    return [0, 1, 2].map((i) => ({
      index: i,
      disc: ds[i] ?? 0,
      starStone: ss[i] ?? '',
      assistStar: as[i] ?? '',
    }))
  }
  // 兼容回退：若没有并行数组，则读取 extensions（如存在）
  const slots = operator.extensions?.discs?.slots as DiscSlot[] | undefined
  if (slots && slots.length > 0) {
    const norm = [...slots]
      .filter((s) => s && typeof s.index === 'number')
      .map((s, i) => ({
        index: s.index ?? i,
        disc: s.disc ?? 0,
        starStone: s.starStone ?? '',
        assistStar: s.assistStar ?? '',
      }))
    while (norm.length < 3)
      norm.push({ index: norm.length, disc: 0, starStone: '', assistStar: '' })
    return norm.sort((a, b) => a.index - b.index).slice(0, 3)
  }
  return [0, 1, 2].map((i) => ({
    index: i,
    disc: 0,
    starStone: '',
    assistStar: '',
  }))
}

function syncLegacyArraysFromSlots(slots: DiscSlot[]) {
  const discsSelected = [0, 0, 0]
  const discStarStones = ['', '', '']
  const discAssistStars = ['', '', '']
  for (const s of slots) {
    if (s.index >= 0 && s.index < 3) {
      discsSelected[s.index] = s.disc ?? 0
      discStarStones[s.index] = s.starStone ?? ''
      discAssistStars[s.index] = s.assistStar ?? ''
    }
  }
  return { discsSelected, discStarStones, discAssistStars }
}

function setDiscSlot(
  operator: EditorOperator,
  slotIndex: number,
  updates: Partial<Pick<DiscSlot, 'disc' | 'starStone' | 'assistStar'>>,
): EditorOperator {
  const prev = getDiscSlots(operator)
  const nextSlots = prev.map((s) =>
    s.index === slotIndex ? { ...s, ...updates } : { ...s },
  )

  // 去重：如果选择了某个具体命盘（>0），清除其它槽位的相同选择
  const chosen = nextSlots[slotIndex]?.disc
  if (typeof chosen === 'number' && chosen > 0) {
    for (let i = 0; i < nextSlots.length; i++) {
      if (i !== slotIndex && nextSlots[i].disc === chosen) {
        nextSlots[i] = { ...nextSlots[i], disc: 0 }
      }
    }
  }

  const { discsSelected, discStarStones, discAssistStars } =
    syncLegacyArraysFromSlots(nextSlots)

  const next: EditorOperator = {
    ...operator,
    // 按原方案落盘：并行数组为主
    discsSelected,
    discStarStones,
    discAssistStars,
    // 若已有其他 extensions 字段（如 stats），保留但不写 discs
    ...(operator.extensions
      ? {
          extensions: {
            ...operator.extensions,
            discs: operator.extensions.discs,
          },
        }
      : {}),
  }
  return next
}

function getStats(
  operator: EditorOperator,
  _rarityFallback = 6,
): { starLevel: number; attack: number; hp: number } {
  const s = operator.extensions?.stats
  return {
    // 默认 0 星
    starLevel:
      s?.starLevel ??
      (typeof (operator as any).starLevel === 'number'
        ? (operator as any).starLevel
        : undefined) ??
      0,
    attack:
      s?.attack ??
      (typeof (operator as any).attack === 'number'
        ? (operator as any).attack
        : 0),
    hp:
      s?.hp ??
      (typeof (operator as any).hp === 'number' ? (operator as any).hp : 0),
  }
}

function setStats(
  operator: EditorOperator,
  updates: Partial<{ starLevel: number; attack: number; hp: number }>,
): EditorOperator {
  const prevStats = operator.extensions?.stats ?? {}
  const nextStats = { ...prevStats, ...updates }
  const next: EditorOperator = {
    ...operator,
    // 同步原方案根级字段，便于回退与导出
    ...(updates.starLevel !== undefined
      ? { starLevel: updates.starLevel }
      : {}),
    ...(updates.attack !== undefined ? { attack: updates.attack } : {}),
    ...(updates.hp !== undefined ? { hp: updates.hp } : {}),
    extensions: {
      version: 1 as const,
      ...(operator.extensions ?? {}),
      discs: operator.extensions?.discs,
      stats: nextStats,
    },
  }
  return next
}

interface OperatorItemProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  onOverlay?: boolean
  onChange?: (operator: EditorOperator) => void
  onRemove?: () => void
}

export const OperatorItem: FC<OperatorItemProps> = memo(
  ({
    operator,
    onRemove,
    onChange,
    onOverlay,
    isDragging,
    attributes,
    listeners,
  }) => {
    const t = useTranslation()
    const displayName = useLocalizedOperatorName(operator.name)
    const setFavOperators = useSetAtom(editorFavOperatorsAtom)
    const info = findOperatorByName(operator.name)
    const edit = useEdit()

    const controlsEnabled = true
    const requirements = useMemo(
      () => withDefaultRequirements(operator.requirements, info?.rarity),
      [operator.requirements, info?.rarity],
    )
    const skillCount = useMemo(() => (info ? getSkillCount(info) : 0), [info])
    const [skillLevels, setSkillLevels] = useState<Record<number, number>>({})
    const discList = useMemo(() => info?.discs ?? [], [info])

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
        className={clsx(
          'relative flex flex-col gap-1',
          !onOverlay && 'w-full',
          isDragging && 'invisible',
        )}
      >
        <div className="relative items-center">
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
              className="card-shadow-subtle relative w-20 p-0 !py-0 flex flex-col overflow-hidden select-none pointer-events-auto"
              {...attributes}
              {...listeners}
            >
              <OperatorAvatar
                id={info?.id}
                rarity={info?.rarity}
                className="w-20 h-20 rounded-b-none"
                fallback={displayName}
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
          {/* 星级（5星可点，默认0；重复点击当前星 -> 0）——移出 Card，避免误触头像/名字 */}
          <div className="mt-1 flex items-center justify-center gap-1 select-none">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
              const current = clamp(
                getStats(operator, info?.rarity).starLevel ?? 0,
                0,
                5,
              )
              const filled = n <= current
              return (
                <button
                  key={'star-' + n}
                  type="button"
                  title={`星级 ${n}`}
                  className={clsx(
                    'w-4 h-4 p-0 inline-flex items-center justify-center',
                    'transition-opacity',
                    filled
                      ? 'opacity-100 text-yellow-500'
                      : 'opacity-40 text-gray-500',
                  )}
                  onClick={() =>
                    edit(() => {
                      const cur =
                        getStats(operator, info?.rarity).starLevel ?? 0
                      const nextLevel = cur === n ? 0 : n
                      const next = setStats(operator, { starLevel: nextLevel })
                      onChange?.(next)
                      return {
                        action: 'set-operator-starLevel',
                        desc: '设置密探星级',
                        squashBy: operator.id,
                      }
                    })
                  }
                >
                  <Icon icon="star" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Skills & Module controls */}
        {info && (
          <div className="mt-2 select-none shrink-0">
            <ul className="w-[23ch]">
              {/* 攻击力/生命值（置于命盘上方） */}
              {controlsEnabled && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="text-xs opacity-80 w-12">
                      攻击力
                    </span>
                    <NumericInput2
                      intOnly
                      min={0}
                      buttonPosition="none"
                      title={'攻击力'}
                      value={Math.max(
                        0,
                        getStats(operator, info?.rarity).attack,
                      )}
                      containerClassName="flex-1 min-w-0"
                      inputClassName={clsx(
                        'h-8 !w-24 !px-2 !leading-8',
                        'text-center font-bold text-base',
                        '!rounded-md !border-2 transition-colors',
                        // 亮色主题
                        '!bg-white !text-slate-800 !border-slate-400',
                        'focus:!border-sky-500 focus:!ring-2 focus:!ring-sky-400',
                        // 暗色主题：提高前景/边框对比度与聚焦可见度
                        'dark:!bg-slate-800 dark:!text-slate-100 dark:!border-slate-300',
                        'dark:focus:!border-sky-400 dark:focus:!ring-sky-400',
                      )}
                      onValueChange={(_, valueStr) => {
                        edit(() => {
                          let v = Number(valueStr)
                          if (!Number.isFinite(v))
                            return { action: 'skip', desc: 'skip' }
                          v = Math.max(0, Math.round(v))
                          const next = setStats(operator, { attack: v })
                          onChange?.(next)
                          return {
                            action: 'set-operator-attack',
                            desc: '设置密探攻击',
                            squashBy: operator.id,
                          }
                        })
                      }}
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs opacity-80 w-12">
                      生命值
                    </span>
                    <NumericInput2
                      intOnly
                      min={0}
                      buttonPosition="none"
                      title={'生命值'}
                      value={Math.max(0, getStats(operator, info?.rarity).hp)}
                      containerClassName="flex-1 min-w-0"
                      inputClassName={clsx(
                        'h-8 !w-24 !px-2 !leading-8',
                        'text-center font-bold text-base',
                        '!rounded-md !border-2 transition-colors',
                        // 亮色主题
                        '!bg-white !text-slate-800 !border-slate-400',
                        'focus:!border-sky-500 focus:!ring-2 focus:!ring-sky-400',
                        // 暗色主题：提高前景/边框对比度与聚焦可见度
                        'dark:!bg-slate-800 dark:!text-slate-100 dark:!border-slate-300',
                        'dark:focus:!border-sky-400 dark:focus:!ring-sky-400',
                      )}
                      onValueChange={(_, valueStr) => {
                        edit(() => {
                          let v = Number(valueStr)
                          if (!Number.isFinite(v))
                            return { action: 'skip', desc: 'skip' }
                          v = Math.max(0, Math.round(v))
                          const next = setStats(operator, { hp: v })
                          onChange?.(next)
                          return {
                            action: 'set-operator-hp',
                            desc: '设置密探生命',
                            squashBy: operator.id,
                          }
                        })
                      }}
                    />
                  </div>
                </li>
              )}
              {/* 如果有命盘定义，则以命盘集合驱动 skill 选择；否则回退为原来的 1/2/3 技能选择 */}
              {discList.length > 0
                ? [0, 1, 2].map((slot) => {
                    const slots = getDiscSlots(operator)
                    const idx1 = slots[slot]?.disc ?? 0
                    const selectedItem =
                      idx1 > 0 ? discList[idx1 - 1] : undefined
                    const selectedIsAny = idx1 === -1
                    return (
                      <li
                        key={'disc-slot-' + slot}
                        className="relative h-8 flex gap-1"
                      >
                        <Select
                          filterable={false}
                          items={[
                            {
                              name: '任意',
                              abbreviation: '任意',
                              desp: '任意',
                              idx: -1,
                            } as any,
                            ...discList.map((d, idx) => ({ ...d, idx })),
                          ]}
                          itemRenderer={(
                            item,
                            { handleClick, handleFocus, modifiers },
                          ) => (
                            <MenuItem
                              roleStructure="listoption"
                              key={item.idx}
                              className={clsx(
                                'min-w-40 !rounded-none text-sm font-serif text-slate-700 dark:text-slate-200',
                                modifiers.active && Classes.ACTIVE,
                              )}
                              text={
                                item.abbreviation +
                                (item.color ? ` · ${item.color}` : '')
                              }
                              title={item.desp}
                              onClick={handleClick}
                              onFocus={handleFocus}
                              selected={
                                item.idx === -1
                                  ? idx1 === -1
                                  : item.idx + 1 === idx1
                              }
                            />
                          )}
                          onItemSelect={(item) => {
                            edit(() => {
                              const chosen =
                                (item as any).idx === -1
                                  ? -1
                                  : (item as any).idx + 1
                              const next = setDiscSlot(operator, slot, {
                                disc: chosen,
                              })
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
                            title={
                              selectedItem
                                ? selectedItem.desp
                                : selectedIsAny
                                  ? '任意'
                                  : `选择命盘${slot + 1}`
                            }
                            className={clsx(
                              'w-[7ch] whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current',
                              selectedItem
                                ? discColorClasses(selectedItem.color)
                                : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
                            )}
                          >
                            {selectedItem
                              ? selectedItem.abbreviation
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
                            '天府',
                            '天相',
                            '巨门',
                            '太阳',
                            '廉贞',
                            '太阴',
                            '紫微',
                            '七杀',
                            '天机',
                            '武曲',
                            '破军',
                            '天同',
                            '天梁',
                            '贪狼',
                          ]}
                          itemRenderer={(
                            item: string,
                            { handleClick, handleFocus, modifiers },
                          ) => (
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
                              selected={
                                getDiscSlots(operator)[slot]?.starStone === item
                              }
                            />
                          )}
                          onItemSelect={(item: string) => {
                            edit(() => {
                              const next = setDiscSlot(operator, slot, {
                                starStone: item,
                              })
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
                            title={
                              getDiscSlots(operator)[slot]?.starStone ||
                              '选择星石'
                            }
                            className="w-[4ch] whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600"
                          >
                            {getDiscSlots(operator)[slot]?.starStone || '星石'}
                          </Button>
                        </Select>

                        {/* 辅星选择 */}
                        <Select
                          className=""
                          filterable={false}
                          items={[
                            '任意',
                            '红鸾',
                            '阴煞',
                            '天魁',
                            '八座',
                            '陀螺',
                            '地劫',
                            '解神',
                            '禄存',
                            '文曲',
                            '天钺',
                            '火星',
                            '文昌',
                            '天巫',
                            '左辅',
                            '铃星',
                            '恩光',
                            '三台',
                            '擎羊',
                            '天贵',
                            '天姚',
                            '天马',
                            '天刑',
                            '右弼',
                            '地空',
                          ]}
                          itemRenderer={(
                            item: string,
                            { handleClick, handleFocus, modifiers },
                          ) => (
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
                              selected={
                                getDiscSlots(operator)[slot]?.assistStar ===
                                item
                              }
                            />
                          )}
                          onItemSelect={(item: string) => {
                            edit(() => {
                              const next = setDiscSlot(operator, slot, {
                                assistStar: item,
                              })
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
                            title={
                              getDiscSlots(operator)[slot]?.assistStar ||
                              '选择辅星'
                            }
                            className="w-[4ch] whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600"
                          >
                            {getDiscSlots(operator)[slot]?.assistStar || '辅星'}
                          </Button>
                        </Select>
                      </li>
                    )
                  })
                : controlsEnabled &&
                  Array.from({ length: skillCount }, (_, index) => {
                    const available = index <= (requirements.elite ?? 0)
                    const skillNumber = index + 1
                    const selected = operator.skill === skillNumber
                    const maxSkillLevel =
                      (requirements.elite ?? 0) === 2 ? 10 : 7
                    const skillLevel = selected
                      ? (requirements.skillLevel ??
                        getDefaultRequirements(info?.rarity).skillLevel)
                      : (skillLevels[skillNumber] ??
                        getDefaultRequirements(info?.rarity).skillLevel)

                    const selectSkill = () => {
                      if (operator.skill !== skillNumber) {
                        edit(() => {
                          operator as EditorOperator // narrow type for editor
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
                              ? t.models.operator.skill_number({
                                  count: skillNumber,
                                })
                              : t.components.editor2.OperatorItem
                                  .skill_not_available
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
                              if (!Number.isFinite(newLevel))
                                return {
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
                                desc: i18n.actions.editor2
                                  .set_operator_skill_level,
                                squashBy: operator.id,
                              }
                            })
                          }}
                          onWheelFocused={(e) => {
                            e.preventDefault()
                            edit(() => {
                              const newLevel = clamp(
                                (requirements.skillLevel ??
                                  getDefaultRequirements(info?.rarity)
                                    .skillLevel) + (e.deltaY > 0 ? -1 : 1),
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
                                desc: i18n.actions.editor2
                                  .set_operator_skill_level,
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

              {/* Row 5: Module selector */}
              {controlsEnabled && info?.modules && (
                <li>
                  <Select
                    className=""
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
                          count:
                            requirements.module ?? CopilotDocV1.Module.Default,
                          name: getModuleName(
                            (requirements.module ??
                              CopilotDocV1.Module.Default) as CopilotDocV1.Module,
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
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    )
  },
)
OperatorItem.displayName = 'OperatorItem'
