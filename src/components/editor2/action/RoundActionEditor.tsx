import type { IconName } from '@blueprintjs/core'
import { Button, Card, HTMLSelect, Icon, InputGroup } from '@blueprintjs/core'
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DraggableAttributes, SyntheticListenerMap } from '@dnd-kit/core'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'
import clsx from 'clsx'
import isEqual from 'lodash-es/isEqual'
import { Droppable, Sortable } from '../../dnd'
import { useAtomValue } from 'jotai'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'

import { editorAtoms, useEdit } from '../editor-state'
import {
  MappingOptions,
  RoundActionsInput,
  editorActionsToRoundActions,
  roundActionsToEditorActions,
} from './roundMapping'

interface ActionEditorProps {
  className?: string
}

interface RoundFormState {
  slot: string
  basicAction: '普' | '大' | '下'
  extraType: 'again' | 'wait' | 'left' | 'right' | 'lvbu' | 'auto' | 'sp'
  extraSlot: string
  extraAction: '普' | '大' | '下'
  waitMs: string
  restartType: 'full' | 'manual' | 'orange' | 'down'
  restartSlot: string
}

const SLOT_OPTIONS = ['1', '2', '3', '4', '5']
const BASIC_ACTION_OPTIONS = [
  { value: '普', label: 'A' },
  { value: '大', label: '↑' },
  { value: '下', label: '↓' },
] as const
const BASIC_ACTION_LABEL_MAP: Record<RoundFormState['basicAction'], string> = {
  普: 'A',
  大: '↑',
  下: '↓',
}

const getActionSortableId = (roundKey: string, index: number) => `${roundKey}-action-${index}`
const EXTRA_TYPES = [
  { value: 'again', label: '再次行动' },
  { value: 'wait', label: '等待' },
  { value: 'left', label: '切换至左侧目标' },
  { value: 'right', label: '切换至右侧目标' },
  { value: 'lvbu', label: '吕布·切换形态' },
  { value: 'auto', label: '开启自动战斗' },
  { value: 'sp', label: '史子眇sp' },
] as const
const RESTART_TYPES = [
  { value: 'full', label: '全灭重开' },
  { value: 'manual', label: '左上角重开' },
  { value: 'orange', label: '无橙星重开' },
  { value: 'down', label: '阵亡检测重开' },
] as const
const DEFAULT_WAIT_MS = 1000

type ActionViewMode = 'round' | 'round2'

const VIEW_MODE_META: Record<
  ActionViewMode,
  { label: string; icon: IconName; description: string }
> = {
  round: {
    label: '回合视图',
    icon: 'timeline-events',
    description:
      '使用默认映射将回合动作转换为 Copilot 行动，缺失信息已填充默认值。',
  },
  round2: {
    label: '回合视图 2',
    icon: 'layout-grid',
    description:
      '按密探分组展示动作，调整布局不影响导出的 JSON 内容。',
  },
}

type ChipVariant = 'warm' | 'danger' | 'info' | 'teal' | 'success' | 'neutral'

const CHIP_VARIANT_DOT_CLASS: Record<ChipVariant, string> = {
  warm: 'bg-amber-400',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  teal: 'bg-cyan-500',
  success: 'bg-lime-500',
  neutral: 'bg-slate-400',
}

const BASIC_ACTION_VARIANTS: Record<RoundFormState['basicAction'], ChipVariant> = {
  普: 'warm',
  大: 'danger',
  下: 'info',
}

interface TokenEntry {
  token: string
  index: number
}

function extractSlotFromToken(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  const baseMatch = trimmed.match(/^([1-5])([普大下])$/)
  if (baseMatch) {
    return baseMatch[1]
  }

  if (trimmed.startsWith('额外:')) {
    const payload = trimmed.slice('额外:'.length)
    const againMatch = payload.match(/^([1-5])([普大下])$/)
    if (againMatch) {
      return againMatch[1]
    }

    return null
  }

  if (trimmed.startsWith('重开:检测')) {
    const downMatch = trimmed.match(/重开:检测(\d)号位阵亡/)
    if (downMatch) {
      return downMatch[1]
    }
  }

  return null
}

function groupTokensBySlot(actions: string[][]) {
  const slotMap: Record<string, TokenEntry[]> = {}
  const others: TokenEntry[] = []

  actions.forEach((entry, index) => {
    const token = String(entry?.[0] ?? '').trim()
    if (!token) {
      return
    }

    const slot = extractSlotFromToken(token)
    if (slot) {
      if (!slotMap[slot]) {
        slotMap[slot] = []
      }
      slotMap[slot].push({ token, index })
      return
    }

    others.push({ token, index })
  })

  return { slotMap, others }
}

function resolveChipVariant(rawToken: string): ChipVariant {
  const token = rawToken.trim()
  if (!token) {
    return 'neutral'
  }

  const baseMatch = token.match(/^(\d)([普大下])$/)
  if (baseMatch) {
    const actionSymbol = baseMatch[2] as RoundFormState['basicAction']
    return BASIC_ACTION_VARIANTS[actionSymbol]
  }

  if (token.startsWith('额外:')) {
    const extraPayload = token.slice('额外:'.length)
    const normalizedExtraPayload = extraPayload.toLowerCase()
    const againMatch = extraPayload.match(/^(\d)([普大下])$/)
    if (againMatch) {
      const actionSymbol = againMatch[2] as RoundFormState['basicAction']
      return BASIC_ACTION_VARIANTS[actionSymbol]
    }
    if (extraPayload.startsWith('等待')) {
      return 'neutral'
    }
    if (extraPayload.includes('左侧') || extraPayload.includes('右侧')) {
      return 'teal'
    }
    if (extraPayload.includes('吕布')) {
      return 'success'
    }
    if (extraPayload.includes('自动') || normalizedExtraPayload.includes('auto')) {
      return 'info'
    }
    if (extraPayload.includes('史子眇') || normalizedExtraPayload.includes('sp')) {
      return 'warm'
    }
    return 'neutral'
  }

  if (token.startsWith('重开:')) {
    return 'danger'
  }

  return 'neutral'
}

interface RoundChipProps {
  label: string
  variant: ChipVariant
  onRemove?: () => void
  draggableAttributes?: DraggableAttributes
  draggableListeners?: SyntheticListenerMap
  className?: string
  isDraggable?: boolean
}

const RoundChip: FC<RoundChipProps> = ({
  label,
  variant,
  onRemove,
  draggableAttributes,
  draggableListeners,
  className,
  isDraggable,
}) => {
  const cursorClass = isDraggable
    ? 'cursor-grab active:cursor-grabbing'
    : onRemove
      ? 'cursor-pointer'
      : 'cursor-default'

  return (
    <div
      className={clsx(
        'editor-round-chip text-xs sm:text-sm font-medium select-none whitespace-nowrap',
        cursorClass,
        onRemove && 'pr-1.5',
        className,
      )}
      data-variant={variant}
      {...(draggableAttributes ?? {})}
      {...(draggableListeners ?? {})}
    >
      <span
        className={clsx(
          'inline-flex h-2.5 w-2.5 flex-none rounded-full',
          CHIP_VARIANT_DOT_CLASS[variant],
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          className="ml-2 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/60 text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:bg-slate-700/70 dark:hover:bg-slate-600/80 dark:text-slate-200"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove()
          }}
          aria-label="移除此动作"
        >
          <Icon icon="small-cross" iconSize={12} />
        </button>
      ) : null}
    </div>
  )
}

function defaultFormState(): RoundFormState {
  return {
    slot: '1',
    basicAction: '普',
    extraType: 'again',
    extraSlot: '1',
    extraAction: '普',
    waitMs: String(DEFAULT_WAIT_MS),
    restartType: 'full',
    restartSlot: '1',
  }
}

function cloneRoundActions(source: RoundActionsInput): RoundActionsInput {
  const result: RoundActionsInput = {}
  for (const [round, actions] of Object.entries(source)) {
    result[round] = actions.map((entry) => [...entry])
  }
  return result
}

function ensureRoundKey(roundKey: string, input: RoundActionsInput) {
  if (!input[roundKey]) {
    input[roundKey] = []
  }
}

function normalizeRoundActions(input: RoundActionsInput): RoundActionsInput {
  const cleaned: RoundActionsInput = {}
  Object.entries(input)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([round, actions]) => {
      const filtered = actions
        .map((entry) => entry.filter((token) => token.trim()) as string[])
        .filter((entry) => entry.length > 0)
      cleaned[round] = filtered.length > 0 ? filtered : []
    })
  return cleaned
}

export const ActionEditor: FC<ActionEditorProps> = ({ className }) => {
  const actions = useAtomValue(editorAtoms.actions)
  const operation = useAtomValue(editorAtoms.operation)
  const edit = useEdit()

  const slotAssignments: MappingOptions['slotAssignments'] = useMemo(() => {
    const result: MappingOptions['slotAssignments'] = {}
    const candidates = operation.opers ?? []
    for (let i = 0; i < Math.min(5, candidates.length); i += 1) {
      const oper = candidates[i]
      if (oper?.name) {
        result[i + 1] = { name: oper.name }
      }
    }
    return result
  }, [operation.opers])

  const [roundActions, setRoundActions] = useState<RoundActionsInput>(() =>
    editorActionsToRoundActions(actions),
  )
  const roundKeys = useMemo(
    () => Object.keys(roundActions).sort((a, b) => Number(a) - Number(b)),
    [roundActions],
  )
  const [roundForms, setRoundForms] = useState<Record<string, RoundFormState>>(
    () => {
      const initial: Record<string, RoundFormState> = {}
      roundKeys.forEach((key) => {
        initial[key] = defaultFormState()
      })
      return initial
    },
  )
  const [viewMode, setViewMode] = useState<ActionViewMode>('round')

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  useEffect(() => {
    const next = editorActionsToRoundActions(actions)
    setRoundActions((prev) => {
      const merged: RoundActionsInput = { ...next }
      Object.entries(prev).forEach(([roundKey, entries]) => {
        if (!merged[roundKey] && entries.length === 0) {
          merged[roundKey] = []
        }
      })
      return isEqual(prev, merged) ? prev : merged
    })
  }, [actions])

  useEffect(() => {
    setRoundForms((prev) => {
      const next: Record<string, RoundFormState> = {}
      roundKeys.forEach((key) => {
        next[key] = { ...defaultFormState(), ...(prev[key] ?? {}) }
      })
      return next
    })
  }, [roundKeys])

  const applyRoundActions = useCallback(
    (updater: (current: RoundActionsInput) => RoundActionsInput) => {
      setRoundActions((prev) => {
        const cloned = cloneRoundActions(prev)
        const updated = normalizeRoundActions(updater(cloned))
        if (isEqual(prev, updated)) {
          return prev
        }
        edit((get, set) => {
          set(
            editorAtoms.actions,
            roundActionsToEditorActions(updated, {
              slotAssignments,
            }),
          )
          return {
            action: 'round-actions-update',
            desc: '更新回合动作',
          }
        })
        return updated
      })
    },
    [edit, slotAssignments],
  )

  const updateForm = useCallback((roundKey: string, patch: Partial<RoundFormState>) => {
    setRoundForms((prev) => ({
      ...prev,
      [roundKey]: {
        ...prev[roundKey],
        ...patch,
      },
    }))
  }, [])

  const handleAddRound = useCallback(() => {
    applyRoundActions((current) => {
      const next = cloneRoundActions(current)
      const numbers = Object.keys(next).map((key) => Number(key))
      const nextRound = numbers.length ? Math.max(...numbers) + 1 : 1
      next[String(nextRound)] = []
      return next
    })
  }, [applyRoundActions])

  const handleRemoveRound = useCallback(
    (roundKey: string) => {
      applyRoundActions((current) => {
        const next = cloneRoundActions(current)
        delete next[roundKey]
        return next
      })
    },
    [applyRoundActions],
  )

  const handleAddToken = useCallback(
    (roundKey: string, token: string) => {
      applyRoundActions((current) => {
        const next = cloneRoundActions(current)
        ensureRoundKey(roundKey, next)
        next[roundKey].push([token])
        return next
      })
    },
    [applyRoundActions],
  )

  const handleRemoveToken = useCallback(
    (roundKey: string, index: number) => {
      applyRoundActions((current) => {
        const next = cloneRoundActions(current)
        const list = next[roundKey] ?? []
        next[roundKey] = list.filter((_, i) => i !== index)
        if (next[roundKey].length === 0) {
          delete next[roundKey]
        }
        return next
      })
    },
    [applyRoundActions],
  )

  const handleAddBasicAction = useCallback(
    (roundKey: string) => {
      const form = roundForms[roundKey] ?? defaultFormState()
      const token = `${form.slot}${form.basicAction}`
      handleAddToken(roundKey, token)
    },
    [handleAddToken, roundForms],
  )

  const handleAddExtraAction = useCallback(
    (roundKey: string) => {
      const form = roundForms[roundKey] ?? defaultFormState()
      switch (form.extraType) {
        case 'again': {
          const token = '额外:' + form.extraSlot + form.extraAction
          handleAddToken(roundKey, token)
          break
        }
        case 'wait': {
          const waitMs = Math.max(
            0,
            Number.parseInt(form.waitMs, 10) || DEFAULT_WAIT_MS,
          )
          handleAddToken(roundKey, '额外:等待:' + waitMs)
          break
        }
        case 'left':
          handleAddToken(roundKey, '额外:左侧目标')
          break
        case 'right':
          handleAddToken(roundKey, '额外:右侧目标')
          break
        case 'lvbu':
          handleAddToken(roundKey, '额外:吕布')
          break
        case 'auto':
          handleAddToken(roundKey, '额外:开自动')
          break
        case 'sp':
          handleAddToken(roundKey, '额外:史子眇sp')
          break
        default:
          break
      }
    },
    [handleAddToken, roundForms],
  )

  const handleAddRestartAction = useCallback(
    (roundKey: string) => {
      const form = roundForms[roundKey] ?? defaultFormState()
      let token: string
      switch (form.restartType) {
        case 'manual':
          token = '重开:左上角'
          break
        case 'orange':
          token = '重开:无橙星'
          break
        case 'down': {
          const slot = form.restartSlot || '1'
          token = '重开:检测' + slot + '号位阵亡'
          break
        }
        default:
          token = '重开:全灭'
          break
      }
      handleAddToken(roundKey, token)
    },
    [handleAddToken, roundForms],
  )

  const handleSelectSpy = useCallback(
    (roundKey: string, slot: string) => {
      updateForm(roundKey, { slot, extraSlot: slot, restartSlot: slot })
    },
    [updateForm],
  )

  const formatTokenLabel = useCallback(
    (rawToken: string) => {
      const token = rawToken.trim()
      if (!token) {
        return '未设定动作'
      }

      const buildSlotLabel = (slot: number, actionLabel?: string) => {
        const name = slotAssignments?.[slot]?.name?.trim()
        const prefix = name ? `${slot}号位·${name}` : `${slot}号位`
        return actionLabel ? `${prefix}（${actionLabel}）` : prefix
      }

      const baseMatch = token.match(/^(\d)([普大下])$/)
      if (baseMatch) {
        const slot = Number(baseMatch[1])
        const actionSymbol = baseMatch[2] as RoundFormState['basicAction']
        const actionLabel = BASIC_ACTION_LABEL_MAP[actionSymbol]
        return buildSlotLabel(slot, actionLabel)
      }

      if (token.startsWith('额外:')) {
        const extraPayload = token.slice('额外:'.length)
        const againMatch = extraPayload.match(/^([1-5])([普大下])$/)
        if (againMatch) {
          const actionSymbol = againMatch[2] as RoundFormState['basicAction']
          return '再动·' + BASIC_ACTION_LABEL_MAP[actionSymbol]
        }

        if (extraPayload.startsWith('等待:')) {
          const wait = extraPayload.split(':')[1] ?? ''
          return '等待 ' + wait + 'ms'
        }

        if (extraPayload === '左侧目标') {
          return '切换左侧目标'
        }
        if (extraPayload === '右侧目标') {
          return '切换右侧目标'
        }
        if (extraPayload === '吕布') {
          return '吕布切换'
        }
        if (extraPayload === '开自动') {
          return '开启自动'
        }
        if (extraPayload === '史子眇sp') {
          return '史子眇sp'
        }

        return extraPayload
      }

      if (token.startsWith('重开:')) {
        if (token === '重开:无橙星') {
          return '无橙星重开'
        }
        if (token.startsWith('重开:检测')) {
          return token.replace('重开:', '')
        }
        const type = token.split(':')[1]
        return type === '左上角' ? '左上角重开' : '全灭重开'
      }

      return token
    },
    [],
  )

  const formatTokenSummary = useCallback(
    (rawToken: string) => {
      const token = rawToken.trim()
      if (!token) {
        return '未设定'
      }

      const baseMatch = token.match(/^(\d)([普大下])$/)
      if (baseMatch) {
        const actionSymbol = baseMatch[2] as RoundFormState['basicAction']
        return BASIC_ACTION_LABEL_MAP[actionSymbol]
      }

      if (token.startsWith('额外:')) {
        const extraPayload = token.slice('额外:'.length)
        const againMatch = extraPayload.match(/^(\d)([普大下])$/)
        if (againMatch) {
          const actionSymbol = againMatch[2] as RoundFormState['basicAction']
          return `额外·${BASIC_ACTION_LABEL_MAP[actionSymbol]}`
        }

        if (extraPayload.startsWith('等待:')) {
          const wait = extraPayload.split(':')[1] ?? ''
          return `等待 ${wait}ms`
        }

        if (extraPayload === '左侧目标') {
          return '切换左侧目标'
        }
        if (extraPayload === '右侧目标') {
          return '切换右侧目标'
        }
        if (extraPayload === '吕布') {
          return '吕布切换'
        }
        if (extraPayload === '开自动') {
          return '开启自动'
        }
        if (extraPayload === '史子眇sp') {
          return '史子眇sp'
        }

        return extraPayload
      }

      if (token === '重开:无橙星') {
        return '无橙星'
      }
      if (token === '重开:左上角') {
        return '左上角重开'
      }
      if (token === '重开:全灭') {
        return '全灭重开'
      }
      if (token.startsWith('重开:检测')) {
        return token.replace('重开:', '')
      }

      return token
    },
    [],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }
      const activeType = active.data.current?.type as string | undefined

      if (activeType === 'round') {
        const activeKey = active.data.current?.roundKey as string | undefined
        const overKey =
          (over.data.current?.roundKey as string | undefined) ||
          (typeof over.id === 'string' ? over.id : undefined)
        if (!activeKey || !overKey) {
          return
        }
        const fromIndex = roundKeys.indexOf(activeKey)
        const toIndex = roundKeys.indexOf(overKey)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return
        }
        const reorderedKeys = arrayMove(roundKeys, fromIndex, toIndex)
        const mappings = reorderedKeys.map((oldKey, idx) => ({
          oldKey,
          newKey: String(idx + 1),
        }))

        setRoundForms((prev) => {
          const next: Record<string, RoundFormState> = {}
          mappings.forEach(({ oldKey, newKey }) => {
            next[newKey] = prev[oldKey] ?? defaultFormState()
          })
          return next
        })

        applyRoundActions((current) => {
          const next: RoundActionsInput = {}
          mappings.forEach(({ oldKey, newKey }) => {
            next[newKey] = current[oldKey] ?? []
          })
          return next
        })
        return
      }

      if (activeType === 'action') {
        const activeRound = active.data.current?.roundKey as string | undefined
        const activeIndex = active.data.current?.index as number | undefined
        const overData = over.data.current as
          | { type?: string; roundKey?: string; index?: number }
          | undefined
        const overRound = overData?.roundKey
        if (!activeRound || activeIndex === undefined || !overRound || activeRound !== overRound) {
          return
        }
        const list = roundActions[activeRound] ?? []
        if (list.length <= 1) {
          return
        }
        let overIndex = overData?.index
        if (overData?.type === 'round-action-container') {
          overIndex = list.length - 1
        }
        if (overIndex === undefined) {
          return
        }
        const targetIndex = Math.max(0, Math.min(overIndex, list.length - 1))
        if (targetIndex === activeIndex) {
          return
        }
        applyRoundActions((current) => {
          const source = current[activeRound] ?? []
          if (
            activeIndex < 0 ||
            activeIndex >= source.length ||
            targetIndex < 0 ||
            targetIndex >= source.length
          ) {
            return current
          }
          const reordered = arrayMove(source, activeIndex, targetIndex)
          return {
            ...current,
            [activeRound]: reordered,
          }
        })
      }
    },
    [applyRoundActions, roundActions, roundKeys, setRoundForms],
  )

  const renderActionControls = (roundKey: string, form: RoundFormState) => (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">基础动作</div>
        <div className="flex flex-wrap gap-2 items-center">
          <HTMLSelect
            value={form.slot}
            onChange={(e) => updateForm(roundKey, { slot: e.currentTarget.value })}
          >
            {SLOT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} 号位
              </option>
            ))}
          </HTMLSelect>
          <HTMLSelect
            value={form.basicAction}
            onChange={(e) =>
              updateForm(roundKey, {
                basicAction: e.currentTarget.value as RoundFormState['basicAction'],
              })
            }
          >
            {BASIC_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HTMLSelect>
          <Button onClick={() => handleAddBasicAction(roundKey)}>＋动作</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">额外操作</div>
        <div className="flex flex-wrap gap-2 items-center">
          <HTMLSelect
            value={form.extraType}
            onChange={(e) =>
              updateForm(roundKey, {
                extraType: e.currentTarget.value as RoundFormState['extraType'],
              })
            }
          >
            {EXTRA_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HTMLSelect>
          {form.extraType === 'again' && (
            <>
              <HTMLSelect
                value={form.extraSlot}
                onChange={(e) =>
                  updateForm(roundKey, {
                    extraSlot: e.currentTarget.value,
                  })
                }
              >
                {SLOT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} 号位
                  </option>
                ))}
              </HTMLSelect>
              <HTMLSelect
                value={form.extraAction}
                onChange={(e) =>
                  updateForm(roundKey, {
                    extraAction: e.currentTarget.value as RoundFormState['extraAction'],
                  })
                }
              >
                {BASIC_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </HTMLSelect>
            </>
          )}
          {form.extraType === 'wait' && (
            <InputGroup
              value={form.waitMs}
              onChange={(e) => updateForm(roundKey, { waitMs: e.currentTarget.value })}
              type="number"
              min={0}
              placeholder="毫秒"
              style={{ width: 120 }}
            />
          )}
          <Button onClick={() => handleAddExtraAction(roundKey)}>＋额外</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">重开设置</div>
        <div className="flex flex-wrap gap-2 items-center">
          <HTMLSelect
            value={form.restartType}
            onChange={(e) =>
              updateForm(roundKey, {
                restartType: e.currentTarget.value as RoundFormState['restartType'],
              })
            }
          >
            {RESTART_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HTMLSelect>
          {form.restartType === 'down' && (
            <HTMLSelect
              value={form.restartSlot}
              onChange={(e) =>
                updateForm(roundKey, {
                  restartSlot: e.currentTarget.value,
                })
              }
            >
              {SLOT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} 号位
                </option>
              ))}
            </HTMLSelect>
          )}
          <Button onClick={() => handleAddRestartAction(roundKey)}>＋重开</Button>
        </div>
      </div>
    </div>
  )

  const viewMeta = VIEW_MODE_META[viewMode]
  const viewLabel = viewMeta.label
  const viewDescription = viewMeta.description

  return (
    <div className={clsx('px-4 pb-24 space-y-6', className)}>
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">动作序列（{viewLabel}）</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {viewDescription}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(VIEW_MODE_META).map(([key, meta]) => {
              const mode = key as ActionViewMode
              const active = viewMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  className="editor-round-pill text-sm"
                  data-state={active ? 'active' : undefined}
                  data-variant="neutral"
                  aria-pressed={active}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon icon={meta.icon} />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="editor-round-pill text-sm"
            data-variant="warm"
            onClick={handleAddRound}
          >
            <Icon icon="add" />
            <span>新增回合</span>
          </button>
        </div>
      </div>

      {roundKeys.length === 0 ? (
        <Card className="card-shadow-subtle text-sm text-gray-600 dark:text-gray-400">
          当前没有任何回合动作，可点击“新增回合”开始编辑。
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={roundKeys}>
            <ul className="space-y-4">
              {roundKeys.map((roundKey, roundIndex) => {
                const actions = roundActions[roundKey] ?? []
                const form = roundForms[roundKey] ?? defaultFormState()
                const actionItems = actions.map((_, index) =>
                  getActionSortableId(roundKey, index),
                )

                if (viewMode === 'round') {
                  return (
                    <Sortable
                      key={roundKey}
                      id={roundKey}
                      data={{ type: 'round', roundKey, index: roundIndex }}
                      className="list-none"
                    >
                      {({ attributes, listeners }) => (
                        <Card className="card-shadow-subtle space-y-4 !p-4">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-move select-none text-sm"
                              {...attributes}
                              {...listeners}
                            >
                              <Icon icon="drag-handle-vertical" />
                              <div>
                                <h4 className="text-base font-semibold">第 {Number(roundKey)} 回合</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  共 {actions.length} 个动作
                                </p>
                              </div>
                            </div>
                            <Button
                              icon="trash"
                              minimal
                              intent="danger"
                              onClick={() => handleRemoveRound(roundKey)}
                            >
                              删除回合
                            </Button>
                          </div>

                          <Droppable
                            id={`${roundKey}-actions`}
                            data={{ type: 'round-action-container', roundKey }}
                            className="block"
                          >
                            <SortableContext items={actionItems}>
                              <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
                                {actions.map((entry, index) => (
                                  <Sortable
                                    key={getActionSortableId(roundKey, index)}
                                    id={getActionSortableId(roundKey, index)}
                                    data={{ type: 'action', roundKey, index }}
                                    className="list-none"
                                  >
                                    {({
                                      attributes: actionAttributes,
                                      listeners: actionListeners,
                                    }) => (
                                      <RoundChip
                                        label={formatTokenLabel(entry[0] ?? '')}
                                        variant={resolveChipVariant(entry[0] ?? '')}
                                        onRemove={() => handleRemoveToken(roundKey, index)}
                                        draggableAttributes={actionAttributes}
                                        draggableListeners={actionListeners}
                                        isDraggable
                                      />
                                    )}
                                  </Sortable>
                                ))}
                              </ul>
                            </SortableContext>
                            {actions.length === 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                暂无动作，使用下方控件添加。
                              </span>
                            )}
                          </Droppable>

                          {renderActionControls(roundKey, form)}
                        </Card>
                      )}
                    </Sortable>
                  )
                }

                const { slotMap, others } = groupTokensBySlot(actions)
                const assignedSlots = SLOT_OPTIONS.filter((slot) =>
                  Boolean(slotAssignments?.[Number(slot)]?.name),
                )
                const slotsWithTokens = SLOT_OPTIONS.filter((slot) =>
                  (slotMap[slot]?.length ?? 0) > 0,
                )
                const slotsToRender =
                  assignedSlots.length > 0
                    ? SLOT_OPTIONS.filter(
                        (slot) => assignedSlots.includes(slot) || slotsWithTokens.includes(slot),
                      )
                    : slotsWithTokens.length > 0
                      ? slotsWithTokens
                      : SLOT_OPTIONS

                return (
                  <Sortable
                    key={roundKey}
                    id={roundKey}
                    data={{ type: 'round', roundKey, index: roundIndex }}
                    className="list-none"
                  >
                    {({ attributes, listeners }) => (
                      <Card className="card-shadow-subtle space-y-4 !p-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-move select-none text-sm"
                            {...attributes}
                            {...listeners}
                          >
                            <Icon icon="drag-handle-vertical" />
                            <div>
                              <h4 className="text-base font-semibold">第 {Number(roundKey)} 回合</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                共 {actions.length} 个动作
                              </p>
                            </div>
                          </div>
                          <Button
                            icon="trash"
                            minimal
                            intent="danger"
                            onClick={() => handleRemoveRound(roundKey)}
                          >
                            删除回合
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="overflow-x-auto">
                            <div className="flex gap-4 min-w-max">
                              {slotsToRender.map((slot) => {
                                const slotNumber = Number(slot)
                                const spy = slotAssignments?.[slotNumber]
                                const tokensForSlot = slotMap[slot] ?? []
                                const isActive = form.slot === slot
                                return (
                                  <div
                                    key={slot}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelectSpy(roundKey, slot)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        handleSelectSpy(roundKey, slot)
                                      }
                                    }}
                                    className={clsx(
                                      'min-w-[180px] rounded-md border p-3 cursor-pointer select-none transition-colors',
                                      isActive
                                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:border-blue-400/30',
                                    )}
                                  >
                                    <div className="text-sm font-semibold">
                                      {spy?.name ?? `密探 ${slot}`}
                                    </div>
                                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                      {slot} 号位
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {tokensForSlot.length > 0 ? (
                                        tokensForSlot.map((entry) => {
                                          const summaryLabel = `${entry.index + 1}${formatTokenSummary(entry.token)}`
                                          return (
                                            <RoundChip
                                              key={`${roundKey}-${slot}-${entry.index}-${entry.token}`}
                                              label={summaryLabel}
                                              variant={resolveChipVariant(entry.token)}
                                              onRemove={() => handleRemoveToken(roundKey, entry.index)}
                                              className="text-xs sm:text-sm"
                                            />
                                          )
                                        })
                                      ) : (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          暂无动作
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {others.length > 0 && (
                            <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-600 p-3">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                其他动作
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {others.map((entry) => {
                                  const summaryLabel = `${entry.index + 1}${formatTokenSummary(entry.token)}`
                                  return (
                                    <RoundChip
                                      key={`${roundKey}-other-${entry.index}-${entry.token}`}
                                      label={summaryLabel}
                                      variant={resolveChipVariant(entry.token)}
                                      onRemove={() => handleRemoveToken(roundKey, entry.index)}
                                      className="text-xs sm:text-sm"
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {renderActionControls(roundKey, form)}
                        </div>
                      </Card>
                    )}
                  </Sortable>
                )
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

    </div>
  )
}

ActionEditor.displayName = 'ActionEditor'
