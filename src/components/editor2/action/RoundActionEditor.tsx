import { Button, Card, HTMLSelect, InputGroup, Tag } from '@blueprintjs/core'
import clsx from 'clsx'
import isEqual from 'lodash-es/isEqual'
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
  extraType: 'again' | 'wait' | 'left' | 'right'
  extraSlot: string
  extraAction: '普' | '大' | '下'
  waitMs: string
  restartType: 'full' | 'manual'
}

const SLOT_OPTIONS = ['1', '2', '3', '4', '5']
const BASIC_ACTION_OPTIONS = [
  { value: '普', label: '普攻' },
  { value: '大', label: '大招' },
  { value: '下', label: '下拉' },
] as const
const EXTRA_TYPES = [
  { value: 'again', label: '再次行动' },
  { value: 'wait', label: '等待' },
  { value: 'left', label: '切换至左侧目标' },
  { value: 'right', label: '切换至右侧目标' },
] as const
const RESTART_TYPES = [
  { value: 'full', label: '全灭重开' },
  { value: 'manual', label: '左上角重开' },
] as const
const DEFAULT_WAIT_MS = 1000

function defaultFormState(): RoundFormState {
  return {
    slot: '1',
    basicAction: '普',
    extraType: 'again',
    extraSlot: '1',
    extraAction: '普',
    waitMs: String(DEFAULT_WAIT_MS),
    restartType: 'full',
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
        next[key] = prev[key] ?? defaultFormState()
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
          const token = `额外:${form.extraSlot}${form.extraAction}`
          handleAddToken(roundKey, token)
          break
        }
        case 'wait': {
          const waitMs = Math.max(
            0,
            Number.parseInt(form.waitMs, 10) || DEFAULT_WAIT_MS,
          )
          handleAddToken(roundKey, `额外:等待:${waitMs}`)
          break
        }
        case 'left':
          handleAddToken(roundKey, '额外:左侧目标')
          break
        case 'right':
          handleAddToken(roundKey, '额外:右侧目标')
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
      const token = form.restartType === 'manual' ? '重开:左上角' : '重开:全灭'
      handleAddToken(roundKey, token)
    },
    [handleAddToken, roundForms],
  )

  return (
    <div className={clsx('px-4 pb-24 space-y-6', className)}>
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">动作序列（回合视图）</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            使用默认映射将回合动作转换为 Copilot 行动，缺失信息已填充默认值。
          </p>
        </div>
        <Button icon="add" intent="primary" onClick={handleAddRound}>
          新增回合
        </Button>
      </div>

      {roundKeys.length === 0 ? (
        <Card className="card-shadow-subtle text-sm text-gray-600 dark:text-gray-400">
          当前没有任何回合动作，可点击“新增回合”开始编辑。
        </Card>
      ) : (
        roundKeys.map((roundKey) => {
          const actions = roundActions[roundKey] ?? []
          const form = roundForms[roundKey] ?? defaultFormState()
          return (
            <Card
              key={roundKey}
              className="card-shadow-subtle space-y-4 !p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold">
                    第 {Number(roundKey)} 回合
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    共 {actions.length} 个动作
                  </p>
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

              <div className="flex flex-wrap gap-2">
                {actions.map((entry, index) => (
                  <Tag
                    key={`${roundKey}-${index}-${entry[0]}`}
                    onRemove={() => handleRemoveToken(roundKey, index)}
                    large
                    intent="primary"
                  >
                    {entry[0]}
                  </Tag>
                ))}
                {actions.length === 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    暂无动作，使用下方控件添加。
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">基础动作</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <HTMLSelect
                      value={form.slot}
                      onChange={(e) =>
                        updateForm(roundKey, { slot: e.currentTarget.value })
                      }
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
                    <Button onClick={() => handleAddBasicAction(roundKey)}>
                      ＋动作
                    </Button>
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
                        onChange={(e) =>
                          updateForm(roundKey, { waitMs: e.currentTarget.value })
                        }
                        type="number"
                        min={0}
                        placeholder="毫秒"
                        style={{ width: 120 }}
                      />
                    )}
                    <Button onClick={() => handleAddExtraAction(roundKey)}>
                      ＋额外
                    </Button>
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
                    <Button onClick={() => handleAddRestartAction(roundKey)}>
                      ＋重开
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}

ActionEditor.displayName = 'ActionEditor'
