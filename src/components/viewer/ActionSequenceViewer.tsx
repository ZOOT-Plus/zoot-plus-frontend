import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  NonIdealState,
  Tag,
} from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { FC, useMemo, useState } from 'react'

import { languageAtom, useTranslation } from '../../i18n/i18n'
import type { Language } from '../../i18n/i18n'
import { Operation } from '../../models/operation'
import { getLocalizedOperatorName } from '../../models/operator'
import { OperatorAvatar } from '../OperatorAvatar'
import {
  RoundActionsInput,
  editorActionsToRoundActions,
} from '../editor2/action/roundMapping'
import type { BasicActionSymbol, SlotKey } from '../editor2/action/tokenUtils'
import {
  CHIP_VARIANT_DOT_CLASS,
  SLOT_KEYS,
  extractSlotFromToken,
  resolveChipVariant,
} from '../editor2/action/tokenUtils'
import { simingActionsToRoundActions } from '../editor2/siming-export'

interface ActionSequenceViewerProps {
  operation: Operation
}

type EditorAction = import('../editor2/editor-state').EditorAction

type SlotAssignments = Partial<
  Record<number, { name?: string; rawName?: string }>
>

interface DisplayRound {
  round: number
  tokens: DisplayToken[]
}

interface DisplayToken {
  raw: string
  label: string
  key: string
  order: number
}

type ViewMode = 'flow' | 'table'

const BASIC_ACTION_SUMMARY_MAP: Record<BasicActionSymbol, string> = {
  普: 'A',
  大: '↑',
  下: '↓',
}

export const ActionSequenceViewer: FC<ActionSequenceViewerProps> = ({
  operation,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)

  const slotAssignments = useMemo(
    () => buildSlotAssignments(operation, language),
    [operation, language],
  )

  const { rounds, isSiming } = useMemo(() => {
    const standard = collectRoundsFromStandardActions(
      operation,
      slotAssignments,
      language,
    )
    if (standard) {
      return standard
    }

    const siming = collectRoundsFromSimingActions(
      operation,
      slotAssignments,
      language,
    )
    if (siming) {
      return siming
    }

    return { rounds: [], isSiming: false }
  }, [operation, slotAssignments, language])

  const [viewMode, setViewMode] = useState<ViewMode>('table')

  if (!rounds.length) {
    return (
      <NonIdealState
        className="my-2"
        title={t.components.viewer.OperationViewer.no_actions}
        description={t.components.viewer.OperationViewer.no_actions_defined}
        icon="slash"
        layout="horizontal"
      />
    )
  }

  const viewModeOptions: Array<{
    mode: ViewMode
    icon: 'timeline-events' | 'layout-grid'
    label: string
  }> = [
    {
      mode: 'flow',
      icon: 'timeline-events',
      label: t.components.viewer.OperationViewer.action_view_mode_flow,
    },
    {
      mode: 'table',
      icon: 'layout-grid',
      label: t.components.viewer.OperationViewer.action_view_mode_table,
    },
  ]

  const renderFlowRound = ({ round, tokens }: DisplayRound) => (
    <Card key={round} className="card-shadow-subtle space-y-3 !p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">
            {t.components.viewer.OperationViewer.round_title({ round })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t.components.viewer.OperationViewer.round_action_count({
              count: tokens.length,
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tokens.map(({ raw, label, key }) => (
          <Tag
            key={key}
            large
            intent="primary"
            minimal
            title={raw !== label ? raw : undefined}
          >
            {label}
          </Tag>
        ))}
      </div>
    </Card>
  )

  const renderTableView = () => {
    const tableRows = rounds.map((roundEntry) => {
      const { slotMap, others } = groupTokensForTable(roundEntry.tokens)
      return {
        round: roundEntry.round,
        tokens: roundEntry.tokens,
        slotMap,
        others,
      }
    })

    const assignedSlots = SLOT_KEYS.filter((slot) =>
      Boolean(slotAssignments[Number(slot)]?.name),
    )
    const slotsWithTokens = new Set<SlotKey>()
    tableRows.forEach(({ slotMap }) => {
      SLOT_KEYS.forEach((slot) => {
        if ((slotMap[slot]?.length ?? 0) > 0) {
          slotsWithTokens.add(slot)
        }
      })
    })

    const slotsToRender =
      assignedSlots.length > 0
        ? SLOT_KEYS.filter(
            (slot) => assignedSlots.includes(slot) || slotsWithTokens.has(slot),
          )
        : slotsWithTokens.size > 0
          ? SLOT_KEYS.filter((slot) => slotsWithTokens.has(slot))
          : SLOT_KEYS

    const hasOtherActions = tableRows.some(({ others }) => others.length > 0)

    const noActionsText =
      t.components.viewer.OperationViewer.action_table_no_actions
    const otherActionsText =
      t.components.viewer.OperationViewer.action_table_other_actions
    const roundHeaderText = language === 'zh_tw' ? '回合' : '回合'

    return (
      <Card key="table-view" className="card-shadow-subtle space-y-4 !p-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-slate-800/60">
                    <th className="w-[140px] align-top border border-gray-200 dark:border-gray-600 px-3 py-2 text-left text-sm font-semibold">
                      {roundHeaderText}
                    </th>
                    {slotsToRender.map((slotKey) => {
                      const slotNumber = Number(slotKey)
                      const assignment = slotAssignments[slotNumber]
                      const operatorName = assignment?.name?.trim()
                      const placeholder =
                        t.components.viewer.OperationViewer.action_table_slot_placeholder(
                          { slot: slotNumber },
                        )
                      const slotLabel = operatorName || placeholder
                      const slotPosition =
                        t.components.viewer.OperationViewer.action_table_slot_position(
                          { slot: slotNumber },
                        )

                      return (
                        <th
                          key={slotKey}
                          className="w-[180px] align-top border border-gray-200 dark:border-gray-600 px-3 py-3 text-sm font-semibold text-center bg-white dark:bg-slate-800/60"
                        >
                          <div className="flex flex-col items-center gap-2">
                            {assignment?.rawName ? (
                              <OperatorAvatar
                                name={assignment.rawName}
                                size="verylarge"
                                sourceSize={96}
                                className="h-28 w-20 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-full items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                {placeholder}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-center">
                              {slotLabel}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {slotPosition}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                    {hasOtherActions && (
                      <th className="w-[200px] align-top border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800/60">
                        {otherActionsText}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr
                      key={row.round}
                      className="bg-white dark:bg-slate-800/60"
                    >
                      <th className="w-[140px] align-top border border-gray-200 dark:border-gray-600 px-3 py-3 text-left">
                        <div className="text-sm font-semibold">
                          {t.components.viewer.OperationViewer.round_title({
                            round: row.round,
                          })}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t.components.viewer.OperationViewer.round_action_count(
                            {
                              count: row.tokens.length,
                            },
                          )}
                        </div>
                      </th>
                      {slotsToRender.map((slotKey) => {
                        const slotTokens = row.slotMap[slotKey] ?? []
                        return (
                          <td
                            key={`${row.round}-${slotKey}`}
                            className="w-[180px] align-top border border-gray-200 dark:border-gray-600 px-3 py-3"
                          >
                            {slotTokens.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {slotTokens.map((token) => {
                                  const variant = resolveChipVariant(token.raw)
                                  const summary = formatTokenSummary(
                                    token.raw,
                                    language,
                                  )
                                  return (
                                    <div
                                      key={token.key}
                                      className="editor-round-chip text-xs sm:text-sm font-medium select-none whitespace-nowrap cursor-default"
                                      data-variant={variant}
                                      title={token.label}
                                    >
                                      <span
                                        className={clsx(
                                          'inline-flex h-2.5 w-2.5 flex-none rounded-full',
                                          CHIP_VARIANT_DOT_CLASS[variant],
                                        )}
                                        aria-hidden="true"
                                      />
                                      <span className="truncate">
                                        {`${token.order + 1}${summary}`}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {noActionsText}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      {hasOtherActions && (
                        <td className="w-[200px] align-top border border-gray-200 dark:border-gray-600 px-3 py-3">
                          {row.others.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {row.others.map((token) => {
                                const variant = resolveChipVariant(token.raw)
                                const summary = formatTokenSummary(
                                  token.raw,
                                  language,
                                )
                                return (
                                  <div
                                    key={token.key}
                                    className="editor-round-chip text-xs sm:text-sm font-medium select-none whitespace-nowrap cursor-default"
                                    data-variant={variant}
                                    title={token.label}
                                  >
                                    <span
                                      className={clsx(
                                        'inline-flex h-2.5 w-2.5 flex-none rounded-full',
                                        CHIP_VARIANT_DOT_CLASS[variant],
                                      )}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">
                                      {`${token.order + 1}${summary}`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {noActionsText}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="mt-2 flex flex-col pb-8 space-y-4">
      <div className="flex flex-col gap-3">
        {isSiming && (
          <Callout icon="graph" intent="primary">
            {t.components.viewer.OperationViewer.siming_actions_hint}
          </Callout>
        )}
        <div className="flex justify-end">
          <ButtonGroup minimal>
            {viewModeOptions.map((option) => (
              <Button
                key={option.mode}
                icon={option.icon}
                active={viewMode === option.mode}
                intent={viewMode === option.mode ? 'primary' : 'none'}
                onClick={() => setViewMode(option.mode)}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </div>
      {viewMode === 'table'
        ? renderTableView()
        : rounds.map((round) => renderFlowRound(round))}
    </div>
  )
}

function collectRoundsFromStandardActions(
  operation: Operation,
  slotAssignments: SlotAssignments,
  language: Language,
): { rounds: DisplayRound[]; isSiming: boolean } | null {
  const actions = operation.parsedContent.actions
  if (!Array.isArray(actions) || actions.length === 0) {
    return null
  }

  const editorActions: EditorAction[] = actions.map((action, index) => ({
    id: `viewer-action-${index}`,
    ...action,
  })) as unknown as EditorAction[]

  const roundActions = editorActionsToRoundActions(editorActions)
  const rounds = buildDisplayRounds(roundActions, slotAssignments, language)
  if (!rounds.length) {
    return null
  }
  return { rounds, isSiming: false }
}

function collectRoundsFromSimingActions(
  operation: Operation,
  slotAssignments: SlotAssignments,
  language: Language,
): { rounds: DisplayRound[]; isSiming: boolean } | null {
  const actions = operation.parsedContent.simingActions
  if (!actions || Object.keys(actions).length === 0) {
    return null
  }
  const roundActions = simingActionsToRoundActions(actions)
  const rounds = buildDisplayRounds(roundActions, slotAssignments, language)
  if (!rounds.length) {
    return null
  }
  return { rounds, isSiming: true }
}

function buildDisplayRounds(
  roundActions: RoundActionsInput,
  slotAssignments: SlotAssignments,
  language: Language,
): DisplayRound[] {
  return Object.entries(roundActions)
    .map(([roundKey, entries]) => ({
      round: Number(roundKey),
      tokens:
        entries
          ?.map((entry) => entry?.[0]?.trim())
          .filter((token): token is string => Boolean(token)) ?? [],
    }))
    .filter((entry) => entry.tokens.length > 0 && Number.isFinite(entry.round))
    .sort((a, b) => a.round - b.round)
    .map(({ round, tokens }) => ({
      round,
      tokens: tokens.map((token, index) => ({
        raw: token,
        label: formatTokenLabel(token, slotAssignments, language),
        key: `${round}-${index}-${token}`,
        order: index,
      })),
    }))
}

function buildSlotAssignments(
  operation: Operation,
  language: Language,
): SlotAssignments {
  const assignments: SlotAssignments = {}
  const opers = operation.parsedContent.opers ?? []
  for (let slot = 1; slot <= 5; slot += 1) {
    const operator = opers[slot - 1]
    if (operator?.name) {
      const localized = getLocalizedOperatorName(operator.name, language)
      assignments[slot] = {
        rawName: operator.name,
        name: localized,
      }
    }
  }
  return assignments
}

function formatTokenLabel(
  token: string,
  slotAssignments: SlotAssignments,
  language: Language,
): string {
  const trimmed = token.trim()
  if (!trimmed) {
    return language === 'zh_tw' ? 'Unspecified Action' : '未设定动作'
  }

  const baseMatch = trimmed.match(/^(\d)([普大下])$/)
  if (baseMatch) {
    const slot = Number(baseMatch[1])
    const symbol = baseMatch[2] as BasicActionSymbol
    return buildSlotLabel(
      slotAssignments,
      slot,
      symbolToActionLabel(symbol, language),
      language,
    )
  }

  if (trimmed.startsWith('额外:')) {
    const payload = trimmed.slice('额外:'.length)
    if (payload.startsWith('等待:')) {
      const wait = payload.split(':')[1] ?? '0'
      return language === 'zh_tw'
        ? `Extra: Wait ${wait}ms`
        : `额外:等待 ${wait}ms`
    }
    const againMatch = payload.match(/^(\d)([普大下])$/)
    if (againMatch) {
      const slot = Number(againMatch[1])
      const symbol = againMatch[2] as BasicActionSymbol
      const label = symbolToActionLabel(symbol, language)
      const slotLabel = buildSlotLabel(slotAssignments, slot, label, language)
      return language === 'zh_tw' ? `Extra: ${slotLabel}` : `额外:${slotLabel}`
    }
    if (payload === '左侧目标') {
      return language === 'zh_tw'
        ? 'Extra: Switch to Left Target'
        : '额外:左侧目标'
    }
    if (payload === '右侧目标') {
      return language === 'zh_tw'
        ? 'Extra: Switch to Right Target'
        : '额外:右侧目标'
    }
    return language === 'zh_tw' ? `Extra: ${payload}` : `额外:${payload}`
  }

  if (trimmed.startsWith('重开:')) {
    const rest = trimmed.slice('重开:'.length)
    if (rest === '全灭') {
      return language === 'zh_tw' ? 'Restart: Full Team' : trimmed
    }
    if (rest === '左上角') {
      return language === 'zh_tw' ? 'Restart: Manual' : trimmed
    }
    return language === 'zh_tw' ? `Restart: ${rest}` : trimmed
  }

  return trimmed
}

function buildSlotLabel(
  slotAssignments: SlotAssignments,
  slot: number,
  actionLabel: string | undefined,
  language: Language,
): string {
  const name = slotAssignments[slot]?.name?.trim()
  const slotLabel = language === 'zh_tw' ? `Slot ${slot}` : `${slot}号位`
  const separator = name ? (language === 'zh_tw' ? ' · ' : '·') : ''
  const base = name ? `${slotLabel}${separator}${name}` : slotLabel
  if (!actionLabel) {
    return base
  }
  return language === 'zh_tw'
    ? `${base} (${actionLabel})`
    : `${base}（${actionLabel}）`
}

function symbolToActionLabel(
  symbol: BasicActionSymbol,
  language: Language,
): string {
  if (language === 'zh_tw') {
    if (symbol === '普') return 'Normal Attack'
    if (symbol === '大') return 'Ultimate'
    return 'Defense'
  }
  if (symbol === '普') return '普攻'
  if (symbol === '大') return '大招'
  return '下拉'
}

function groupTokensForTable(tokens: DisplayToken[]) {
  const slotMap: Partial<Record<SlotKey, DisplayToken[]>> = {}
  const others: DisplayToken[] = []

  tokens.forEach((token) => {
    const slot = extractSlotFromToken(token.raw)
    if (slot) {
      if (!slotMap[slot]) {
        slotMap[slot] = []
      }
      slotMap[slot]!.push(token)
      return
    }
    others.push(token)
  })

  return { slotMap, others }
}

function formatTokenSummary(rawToken: string, language: Language): string {
  const token = rawToken.trim()
  if (!token) {
    return language === 'zh_tw' ? '未設定' : '未设定'
  }

  const baseMatch = token.match(/^(\d)([普大下])$/)
  if (baseMatch) {
    const symbol = baseMatch[2] as BasicActionSymbol
    return BASIC_ACTION_SUMMARY_MAP[symbol]
  }

  if (token.startsWith('额外:')) {
    const payload = token.slice('额外:'.length)
    const againMatch = payload.match(/^([1-5])([普大下])$/)
    if (againMatch) {
      const symbol = againMatch[2] as BasicActionSymbol
      const prefix = language === 'zh_tw' ? '再動·' : '再动·'
      return `${prefix}${BASIC_ACTION_SUMMARY_MAP[symbol]}`
    }

    if (payload.startsWith('等待:')) {
      const wait = payload.split(':')[1] ?? ''
      const base = `等待 ${wait}ms`
      return language === 'zh_tw' ? convertToTraditional(base) : base
    }

    if (payload === '左侧目标') {
      return language === 'zh_tw' ? '切換左側目標' : '切换左侧目标'
    }
    if (payload === '右侧目标') {
      return language === 'zh_tw' ? '切換右側目標' : '切换右侧目标'
    }
    if (payload === '吕布' || payload === '吕布·切换形态') {
      return language === 'zh_tw' ? '呂布切換' : '吕布切换'
    }
    if (
      payload === '开自动' ||
      payload === '开启自动' ||
      payload.toLowerCase() === 'auto'
    ) {
      return language === 'zh_tw' ? '開啟自動' : '开启自动'
    }
    if (payload === '史子眇sp') {
      return '史子眇sp'
    }

    return language === 'zh_tw' ? convertToTraditional(payload) : payload
  }

  if (token.startsWith('重开:')) {
    if (token === '重开:无橙星') {
      return language === 'zh_tw' ? '無橙星' : '无橙星'
    }
    if (token === '重开:左上角') {
      return language === 'zh_tw' ? '左上角重開' : '左上角重开'
    }
    if (token === '重开:全灭') {
      return language === 'zh_tw' ? '全滅重開' : '全灭重开'
    }
    if (token.startsWith('重开:检测')) {
      const rest = token.replace('重开:', '')
      return language === 'zh_tw' ? convertToTraditional(rest) : rest
    }
    const rest = token.slice('重开:'.length)
    return language === 'zh_tw' ? convertToTraditional(rest) : rest
  }

  return language === 'zh_tw' ? convertToTraditional(token) : token
}

function convertToTraditional(input: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/额外/g, '額外'],
    [/再动/g, '再動'],
    [/动作/g, '動作'],
    [/切换/g, '切換'],
    [/左侧/g, '左側'],
    [/右侧/g, '右側'],
    [/吕布/g, '呂布'],
    [/开自动/g, '開自動'],
    [/开启/g, '開啟'],
    [/自动/g, '自動'],
    [/无/g, '無'],
    [/灭/g, '滅'],
    [/重开/g, '重開'],
    [/检测/g, '檢測'],
    [/号位/g, '號位'],
    [/阵亡/g, '陣亡'],
    [/设定/g, '設定'],
  ]
  return replacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    input,
  )
}
