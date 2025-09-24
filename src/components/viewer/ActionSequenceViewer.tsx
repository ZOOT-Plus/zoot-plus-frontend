import { Card, Callout, NonIdealState, Tag } from '@blueprintjs/core'
import { useAtomValue } from 'jotai'
import { FC, useMemo } from 'react'

import { useTranslation, languageAtom } from '../../i18n/i18n'
import { Language } from '../../i18n/i18n'
import { Operation } from '../../models/operation'
import { getLocalizedOperatorName } from '../../models/operator'
import {
  RoundActionsInput,
  editorActionsToRoundActions,
} from '../editor2/action/roundMapping'
import { simingActionsToRoundActions } from '../editor2/siming-export'

interface ActionSequenceViewerProps {
  operation: Operation
}

type EditorAction = import('../editor2/editor-state').EditorAction

type SlotAssignments = Partial<Record<number, { name?: string }>>

interface DisplayRound {
  round: number
  tokens: DisplayToken[]
}

interface DisplayToken {
  raw: string
  label: string
  key: string
}

export const ActionSequenceViewer: FC<ActionSequenceViewerProps> = ({
  operation,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)

  const { rounds, isSiming } = useMemo(() => {
    const slotAssignments = buildSlotAssignments(operation, language)
    const roundsFromActions = collectRoundsFromStandardActions(
      operation,
      slotAssignments,
      language,
    )
    if (roundsFromActions) {
      return roundsFromActions
    }

    const roundsFromSiming = collectRoundsFromSimingActions(
      operation,
      slotAssignments,
      language,
    )
    if (roundsFromSiming) {
      return roundsFromSiming
    }

    return { rounds: [], isSiming: false }
  }, [operation, language])

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

  return (
    <div className="mt-2 flex flex-col pb-8 space-y-4">
      {isSiming && (
        <Callout icon="graph" intent="primary">
          {t.components.viewer.OperationViewer.siming_actions_hint}
        </Callout>
      )}
      {rounds.map(({ round, tokens }) => (
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
      ))}
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
      assignments[slot] = {
        name: getLocalizedOperatorName(operator.name, language),
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
    return language === 'en' ? 'Unspecified Action' : '未设定动作'
  }

  const baseMatch = trimmed.match(/^(\d)([普大下])$/)
  if (baseMatch) {
    const slot = Number(baseMatch[1])
    const symbol = baseMatch[2] as '普' | '大' | '下'
    return buildSlotLabel(slotAssignments, slot, symbolToActionLabel(symbol, language), language)
  }

  if (trimmed.startsWith('额外:')) {
    const payload = trimmed.slice('额外:'.length)
    if (payload.startsWith('等待:')) {
      const wait = payload.split(':')[1] ?? '0'
      return language === 'en'
        ? `Extra: Wait ${wait}ms`
        : `额外:等待 ${wait}ms`
    }
    const againMatch = payload.match(/^(\d)([普大下])$/)
    if (againMatch) {
      const slot = Number(againMatch[1])
      const symbol = againMatch[2] as '普' | '大' | '下'
      const label = symbolToActionLabel(symbol, language)
      const slotLabel = buildSlotLabel(slotAssignments, slot, label, language)
      return language === 'en'
        ? `Extra: ${slotLabel}`
        : `额外:${slotLabel}`
    }
    if (payload === '左侧目标') {
      return language === 'en' ? 'Extra: Switch to Left Target' : '额外:左侧目标'
    }
    if (payload === '右侧目标') {
      return language === 'en' ? 'Extra: Switch to Right Target' : '额外:右侧目标'
    }
    return language === 'en' ? `Extra: ${payload}` : `额外:${payload}`
  }

  if (trimmed.startsWith('重开:')) {
    const rest = trimmed.slice('重开:'.length)
    if (rest === '全灭') {
      return language === 'en' ? 'Restart: Full Team' : trimmed
    }
    if (rest === '左上角') {
      return language === 'en' ? 'Restart: Manual' : trimmed
    }
    return language === 'en' ? `Restart: ${rest}` : trimmed
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
  const slotLabel = language === 'en' ? `Slot ${slot}` : `${slot}号位`
  const separator = name ? (language === 'en' ? ' · ' : '·') : ''
  const base = name ? `${slotLabel}${separator}${name}` : slotLabel
  if (!actionLabel) {
    return base
  }
  return language === 'en' ? `${base} (${actionLabel})` : `${base}（${actionLabel}）`
}

function symbolToActionLabel(
  symbol: '普' | '大' | '下',
  language: Language,
): string {
  if (language === 'en') {
    if (symbol === '普') return 'Normal Attack'
    if (symbol === '大') return 'Ultimate'
    return 'Defense'
  }
  if (symbol === '普') return '普攻'
  if (symbol === '大') return '大招'
  return '下拉'
}
