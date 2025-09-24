import { CopilotDocV1 } from '../../../models/copilot.schema'
import { createAction } from '../factories'
import { EditorAction } from '../types'

export type RoundActionsInput = Record<string, string[][]>

export interface ParsedRoundAction {
  round: number
  order: number
  token: string
  raw: string[]
  kind: ParsedTokenKind
  slot?: number
  payload?: number | string
}

type ParsedTokenKind =
  | 'normal'
  | 'ultimate'
  | 'defense'
  | 'again'
  | 'wait'
  | 'switchLeft'
  | 'switchRight'
  | 'restartFull'
  | 'restartManual'
  | 'unknown'

interface SlotConfig {
  name: string
  location: [number, number]
}

export interface MappingOptions {
  defaultPostDelay?: number
  slotAssignments?: Partial<Record<number, Partial<SlotConfig>>>
}

const DEFAULT_POST_DELAY = 1000

const DEFAULT_SLOT_CONFIG: Record<number, SlotConfig> = {
  1: { name: '槽位1干员', location: [120, 520] },
  2: { name: '槽位2干员', location: [240, 520] },
  3: { name: '槽位3干员', location: [360, 520] },
  4: { name: '槽位4干员', location: [480, 520] },
  5: { name: '槽位5干员', location: [600, 520] },
}

const CAMERA_SHIFT = 1

/**
 * 将回合动作 JSON 解析为标准化结构。
 */
export function parseRoundActions(
  input: RoundActionsInput,
): ParsedRoundAction[] {
  return Object.entries(input)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([roundKey, actions]) => {
      const round = Number.parseInt(roundKey, 10) || 0
      const actionList = Array.isArray(actions) ? actions : []
      return actionList.map((entry, index) => {
        const raw = Array.isArray(entry) ? entry : [String(entry)]
        const token = String(raw[0] ?? '').trim()
        const parsedToken = parseToken(token)
        return {
          round,
          order: index,
          token,
          raw,
          ...parsedToken,
        }
      })
    })
}

/**
 * 将回合动作转换为 EditorAction，使用默认补全以保持 Copilot 导出可用。
 */
export function roundActionsToEditorActions(
  input: RoundActionsInput,
  options?: MappingOptions,
): EditorAction[] {
  const parsed = parseRoundActions(input)
  return parsed.map((item) => mapParsedAction(item, options))
}

/**
 * 直接生成 Copilot 协议结构，便于后续联调。
 */
function parseToken(token: string): {
  kind: ParsedTokenKind
  slot?: number
  payload?: number | string
} {
  const mainMatch = token.match(/^(\d)([普大下])$/)
  if (mainMatch) {
    const slot = Number(mainMatch[1])
    const symbol = mainMatch[2]
    if (symbol === '普') {
      return { kind: 'normal', slot }
    }
    if (symbol === '大') {
      return { kind: 'ultimate', slot }
    }
    if (symbol === '下') {
      return { kind: 'defense', slot }
    }
  }

  if (token.startsWith('额外:')) {
    const parts = token.split(':')
    const modifier = parts[1]
    if (modifier === '等待') {
      const ms = Number(parts[2])
      return { kind: 'wait', payload: Number.isFinite(ms) ? ms : undefined }
    }

    if (modifier === '左侧目标') {
      return { kind: 'switchLeft' }
    }

    if (modifier === '右侧目标') {
      return { kind: 'switchRight' }
    }

    const againMatch = modifier?.match(/^(\d)([普大下])$/)
    if (againMatch) {
      const slot = Number(againMatch[1])
      const symbol = againMatch[2]
      const payload = symbol === '普' ? 'normal' : symbol === '大' ? 'ultimate' : 'defense'
      return { kind: 'again', slot, payload }
    }
  }

  if (token.startsWith('重开:')) {
    const type = token.split(':')[1]
    if (type === '全灭') {
      return { kind: 'restartFull' }
    }
    if (type === '左上角') {
      return { kind: 'restartManual' }
    }
  }

  return { kind: 'unknown' }
}

function mapParsedAction(
  action: ParsedRoundAction,
  options?: MappingOptions,
): EditorAction {
  const slot = action.slot ?? 1
  const slotConfig = resolveSlotConfig(slot, options)
  const postDelay = options?.defaultPostDelay ?? DEFAULT_POST_DELAY
  const docPrefix = `第${action.round}回合·动作${action.order + 1}`

  switch (action.kind) {
    case 'normal':
    case 'ultimate':
    case 'defense':
    case 'again': {
      const descriptor = describeAttack(action, slotConfig.name)
      return createAction({
        type: CopilotDocV1.Type.Skill,
        name: slotConfig.name,
        location: slotConfig.location,
        doc: formatDoc(docPrefix, descriptor, action.token),
        postDelay,
      })
    }
    case 'wait': {
      const waitMs = typeof action.payload === 'number' ? action.payload : postDelay
      return createAction({
        type: CopilotDocV1.Type.Output,
        doc: formatDoc(docPrefix, `等待${waitMs}毫秒`, `额外:等待:${waitMs}`),
        postDelay: waitMs,
      })
    }
    case 'switchLeft': {
      return createAction({
        type: CopilotDocV1.Type.MoveCamera,
        doc: formatDoc(docPrefix, '切换至左侧目标', '额外:左侧目标'),
        distance: [-CAMERA_SHIFT, 0],
        postDelay,
      })
    }
    case 'switchRight': {
      return createAction({
        type: CopilotDocV1.Type.MoveCamera,
        doc: formatDoc(docPrefix, '切换至右侧目标', '额外:右侧目标'),
        distance: [CAMERA_SHIFT, 0],
        postDelay,
      })
    }
    case 'restartFull': {
      return createAction({
        type: CopilotDocV1.Type.SkillDaemon,
        doc: formatDoc(docPrefix, '触发全灭重开', '重开:全灭'),
        postDelay,
      })
    }
    case 'restartManual': {
      return createAction({
        type: CopilotDocV1.Type.SkillDaemon,
        doc: formatDoc(docPrefix, '触发左上角重开', '重开:左上角'),
        postDelay,
      })
    }
    default: {
      const rawText = action.token || action.raw.join(' ')
      return createAction({
        type: CopilotDocV1.Type.Output,
        doc: formatDoc(docPrefix, `未识别动作（${rawText}）`, rawText || '未知'),
        postDelay,
      })
    }
  }
}

function resolveSlotConfig(
  slot: number,
  options?: MappingOptions,
): SlotConfig {
  const base = DEFAULT_SLOT_CONFIG[slot] ?? DEFAULT_SLOT_CONFIG[1]
  const override = options?.slotAssignments?.[slot]
  if (!override) {
    return base
  }
  return {
    name: override.name ?? base.name,
    location: override.location ?? base.location,
  }
}

function describeAttack(action: ParsedRoundAction, slotName: string): string {
  switch (action.kind) {
    case 'ultimate':
      return `${slotName} 释放大招`
    case 'defense':
      return `${slotName} 下拉防御`
    case 'again':
      return `${slotName} 再次行动${describeAgainVariant(action.payload)}`
    default:
      return `${slotName} 普攻`
  }
}

function describeAgainVariant(payload?: number | string) {
  if (payload === 'ultimate') {
    return '（大招）'
  }
  if (payload === 'defense') {
    return '（下拉）'
  }
  return '（普攻）'
}

function formatDoc(prefix: string, body: string, token: string) {
  const safeToken = token?.trim() || '未知'
  return `${prefix}：${body} [${safeToken}]`
}

export function editorActionsToRoundActions(
  actions: EditorAction[],
): RoundActionsInput {
  const result: RoundActionsInput = {}
  let fallbackRound = 1

  actions.forEach((action) => {
    const meta = extractMetadataFromDoc(action.doc)
    const round = meta.round ?? fallbackRound
    const token = meta.token ?? guessTokenFromAction(action)
    const roundKey = String(round)
    if (!result[roundKey]) {
      result[roundKey] = []
    }
    result[roundKey].push([token])
    fallbackRound = round
  })

  return Object.fromEntries(
    Object.entries(result)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([roundKey, entries]) => [
        roundKey,
        entries.filter((entry) => entry && entry[0]?.trim()).map((entry) => [entry[0].trim()]),
      ]),
  )
}

function extractMetadataFromDoc(doc?: string) {
  if (!doc) {
    return {}
  }
  const roundMatch = doc.match(/第(\d+)回合·动作(\d+)/)
  const tokenMatch = doc.match(/\[([^\]]+)\]\s*$/)
  return {
    round: roundMatch ? Number(roundMatch[1]) : undefined,
    token: tokenMatch ? tokenMatch[1].trim() : undefined,
  }
}

function guessTokenFromAction(action: EditorAction): string {
  const slot = extractSlotFromDoc(action.doc) ?? 1
  switch (action.type) {
    case CopilotDocV1.Type.MoveCamera:
      if (action.doc?.includes('左侧')) {
        return '额外:左侧目标'
      }
      if (action.doc?.includes('右侧')) {
        return '额外:右侧目标'
      }
      return '额外:左侧目标'
    case CopilotDocV1.Type.SkillDaemon:
      if (action.doc?.includes('左上角')) {
        return '重开:左上角'
      }
      return '重开:全灭'
    case CopilotDocV1.Type.Output:
      if (action.doc?.includes('等待')) {
        const waitMatch = action.doc.match(/等待(\d+)毫秒/)
        const waitMs = waitMatch ? Number(waitMatch[1]) : getActionPostDelay(action) ?? DEFAULT_POST_DELAY
        return `额外:等待:${waitMs}`
      }
      if (action.doc?.includes('未识别动作')) {
        const unknownMatch = action.doc.match(/未识别动作（(.+?)）/)
        if (unknownMatch) {
          return unknownMatch[1]
        }
      }
      return `额外:等待:${getActionPostDelay(action) ?? DEFAULT_POST_DELAY}`
    case CopilotDocV1.Type.Skill:
      if (action.doc?.includes('大招')) {
        return `${slot}大`
      }
      if (action.doc?.includes('下拉')) {
        return `${slot}下`
      }
      if (action.doc?.includes('再次行动')) {
        const variant = action.doc.match(/再次行动（(.+?)）/)
        const symbol = mapVariantToSymbol(variant ? variant[1] : undefined)
        return `额外:${slot}${symbol}`
      }
      return `${slot}普`
    default:
      return `${slot}普`
  }
}

function extractSlotFromDoc(doc?: string) {
  if (!doc) return undefined
  const match = doc.match(/槽位(\d)/)
  return match ? Number(match[1]) : undefined
}

function getActionPostDelay(action: EditorAction) {
  return (action as { postDelay?: number }).postDelay
}

function mapVariantToSymbol(label?: string) {
  if (!label) {
    return '普'
  }
  if (label.includes('大')) {
    return '大'
  }
  if (label.includes('下')) {
    return '下'
  }
  return '普'
}
