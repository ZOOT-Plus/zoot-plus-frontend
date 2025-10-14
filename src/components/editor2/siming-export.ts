import { CopilotDocV1 } from '../../models/copilot.schema'
import type { Level } from '../../models/operation'
import { OpDifficulty, OpDifficultyBitFlag } from '../../models/operation'
import {
  RoundActionsInput,
  editorActionsToRoundActions,
} from './action/roundMapping'
import {
  DEFAULT_SIMING_ACTION_DELAYS,
  DEFAULT_SIMING_ATTACK_DELAY,
  DEFAULT_SIMING_DEFENSE_DELAY,
  DEFAULT_SIMING_ULTIMATE_DELAY,
  SimingActionDelays,
} from './siming/constants'
import { EditorOperation } from './types'
import { CopilotOperationLoose } from './validation/schema'

export interface SimingActionConfig {
  action?: string
  target?: number[]
  begin?: number[]
  end?: number[]
  recognition?: string
  expected?: string
  roi?: number[]
  pre_delay?: number
  post_delay?: number
  rear_delay?: number
  duration?: number
  text_doc?: string
  template?: string | string[]
  timeout?: number
  green_mask?: boolean
  next?: string[]
  [key: string]: unknown
}

export type SimingActionMap = Record<string, SimingActionConfig>

export type SimingOperation = Omit<CopilotOperationLoose, 'actions'> & {
  actions: SimingActionMap
}

const ACTION_TEMPLATES: Record<string, SimingActionConfig> = {
  '1号位上拉': {
    action: 'Swipe',
    begin: [77, 1060, 10, 1],
    end: [77, 670, 10, 1],
    post_delay: 5000,
    duration: 800,
  },
  '1号位下拉': {
    action: 'Swipe',
    begin: [73, 1060, 1, 1],
    end: [73, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '1号位普攻': {
    action: 'Click',
    target: [56, 1060, 5, 5],
    post_delay: 3000,
  },
  '2号位上拉': {
    action: 'Swipe',
    begin: [220, 1060, 1, 1],
    end: [225, 668, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '2号位下拉': {
    action: 'Swipe',
    begin: [221, 1060, 1, 1],
    end: [221, 1251, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '2号位普攻': {
    action: 'Click',
    target: [180, 1060, 5, 5],
    post_delay: 3000,
  },
  '3号位上拉': {
    action: 'Swipe',
    begin: [357, 1060, 1, 1],
    end: [357, 714, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '3号位下拉': {
    action: 'Swipe',
    begin: [357, 1060, 1, 1],
    end: [357, 1237, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '3号位普攻': {
    action: 'Click',
    target: [357, 1060, 5, 5],
    post_delay: 3000,
  },
  '4号位上拉': {
    action: 'Swipe',
    begin: [496, 1060, 1, 1],
    end: [496, 679, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '4号位下拉': {
    action: 'Swipe',
    begin: [496, 1060, 1, 1],
    end: [496, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '4号位普攻': {
    action: 'Click',
    target: [496, 1060, 5, 5],
    post_delay: 3000,
  },
  '5号位上拉': {
    action: 'Swipe',
    begin: [646, 1060, 1, 1],
    end: [642, 700, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '5号位下拉': {
    action: 'Swipe',
    begin: [646, 1060, 1, 1],
    end: [646, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '5号位普攻': {
    action: 'Click',
    target: [646, 1060, 5, 5],
    post_delay: 3000,
  },
  切换敌人: {
    action: 'Swipe',
    begin: [77, 991, 5, 5],
    end: [77, 670, 5, 5],
    post_delay: 3000,
  },
}

const TARGET_LEFT_ACTION: SimingActionConfig = {
  text_doc: '左侧目标',
  focus: '切换至左侧目标',
  action: 'Click',
  target: [154, 648, 1, 1],
  post_delay: 2000,
  duration: 800,
}

const TARGET_RIGHT_ACTION: SimingActionConfig = {
  text_doc: '右侧目标',
  focus: '切换至右侧目标',
  action: 'Click',
  target: [603, 413, 18, 21],
  post_delay: 2000,
  duration: 800,
}

const EXTRA_ACTION_TEMPLATES: Record<string, SimingActionConfig> = {
  吕布: {
    text_doc: '吕布',
    focus: '点击吕布-切换形态',
    recognition: 'TemplateMatch',
    template: ['copilot/lb_l2h.png', 'copilot/lb_h2l.png'],
    roi: [15, 1072, 690, 95],
    action: 'Click',
    pre_delay: 500,
    post_delay: 3000,
  },
  开自动: {
    text_doc: '开自动',
    focus: '开始自动战斗',
    recognition: 'OCR',
    expected: '手',
    roi: [635, 610, 85, 95],
    action: 'Click',
    timeout: 1800000,
  },
  史子眇sp: {
    text_doc: '额外:史子眇sp',
    focus: '点击史子眇sp',
    recognition: 'TemplateMatch',
    template: 'copilot/szm_sp_skill.png',
    roi: [15, 1072, 690, 95],
    action: 'Click',
    pre_delay: 500,
    post_delay: 5000,
  },
}

const ORANGE_RESTART_LABEL = '重开:无橙星'
const DOWN_RESTART_PREFIX = '重开:检测'

const ORANGE_DETECTION_TEMPLATE: SimingActionConfig = {
  recognition: 'ColorMatch',
  upper: [255, 255, 120],
  lower: [180, 160, 40],
  roi: [58, 160, 103, 88],
  next: [],
}

const DETECTION_ROI: Readonly<[number, number, number, number]> = [
  641, 50, 43, 27,
]
const RESTART_FULL_TARGET = '抄作业全灭重开'
const RESTART_MANUAL_TARGET = '抄作业点左上角重开'
const RESTART_FULL_LABEL = '重开:全灭'
const RESTART_MANUAL_LABEL = '重开:左上角'
const RESTART_NODE_KEY = '抄作业点左上角重开'

const RESTART_NODE: SimingActionConfig = {
  recognition: 'TemplateMatch',
  template: 'back.png',
  green_mask: true,
  threshold: 0.5,
  roi: [6, 8, 123, 112],
  action: 'Click',
  pre_delay: 2000,
  post_delay: 2000,
  next: ['抄作业确定左上角重开', '抄作业找到关卡-主线'],
  timeout: 20000,
}

function cloneConfig(
  config: SimingActionConfig | undefined,
): SimingActionConfig | undefined {
  if (!config) {
    return undefined
  }
  return JSON.parse(JSON.stringify(config)) as SimingActionConfig
}

function templateKeyFromToken(token: string): string | undefined {
  const match = token.match(/^(\d)([普大下])$/)
  if (!match) {
    return undefined
  }
  const position = match[1]
  const type = match[2]

  if (type === '普') {
    return `${position}号位普攻`
  }
  if (type === '大') {
    return `${position}号位上拉`
  }
  return `${position}号位下拉`
}

function resolveDelayForTemplate(
  templateKey: string | undefined,
  delays: SimingActionDelays,
): number | undefined {
  if (!templateKey) {
    return undefined
  }
  if (templateKey.endsWith('普攻')) {
    return delays.attack
  }
  if (templateKey.endsWith('上拉')) {
    return delays.ultimate
  }
  if (templateKey.endsWith('下拉')) {
    return delays.defense
  }
  return undefined
}

function applyDelayFromToken(
  config: SimingActionConfig,
  token: string,
  delays: SimingActionDelays,
) {
  const raw = token.startsWith('额外:') ? (token.split(':', 2)[1] ?? '') : token
  const templateKey = templateKeyFromToken(raw)
  const override = resolveDelayForTemplate(templateKey, delays)
  if (override !== undefined) {
    config.post_delay = override
  }
}

function createCustomDelayNode(delays: SimingActionDelays): SimingActionConfig {
  const normalize = (value: number | undefined, fallback: number) => {
    const numberLike = Number(value)
    const normalized =
      Number.isFinite(numberLike) && numberLike >= 0
        ? Math.round(numberLike)
        : fallback
    return String(normalized)
  }

  return {
    attack_delay: normalize(delays.attack, DEFAULT_SIMING_ATTACK_DELAY),
    ult_delay: normalize(delays.ultimate, DEFAULT_SIMING_ULTIMATE_DELAY),
    defense_delay: normalize(delays.defense, DEFAULT_SIMING_DEFENSE_DELAY),
  }
}

function parseDownRestartPosition(token: string): number {
  const trimmed = token
    .replace(DOWN_RESTART_PREFIX, '')
    .replace('号位阵亡', '')
    .trim()
  const digit = trimmed.charAt(0)
  const position = Number.parseInt(digit, 10)
  return Number.isFinite(position) && position >= 1 ? position : 1
}

function buildRoundNodes(
  roundActions: RoundActionsInput,
  delays: SimingActionDelays,
): SimingActionMap {
  const entries = Object.entries(roundActions)
    .filter(([round]) => !Number.isNaN(Number(round)))
    .sort(([a], [b]) => Number(a) - Number(b))

  const result: SimingActionMap = {}
  result['抄作业自定义延时'] = createCustomDelayNode(delays)
  if (entries.length === 0) {
    result[RESTART_NODE_KEY] = ensureNextArray(
      cloneConfig(RESTART_NODE) ?? { next: [] },
    )
    return result
  }

  const roundsWithOrangeRestart = new Set<string>()
  let maxRoundWithActions = 0

  entries.forEach(([roundKey, actions]) => {
    const actionList = Array.isArray(actions) ? actions : []
    const hasNodeAction = actionList.some((entry) => {
      const token = entry?.[0]?.trim()
      if (!token) {
        return false
      }
      if (token === ORANGE_RESTART_LABEL) {
        roundsWithOrangeRestart.add(roundKey)
        return false
      }
      if (token.startsWith(DOWN_RESTART_PREFIX)) {
        return true
      }
      return !token.startsWith('重开:')
    })

    if (
      actionList.some((entry) => entry?.[0]?.trim() === ORANGE_RESTART_LABEL)
    ) {
      roundsWithOrangeRestart.add(roundKey)
    }

    if (hasNodeAction) {
      const roundNum = Number(roundKey)
      if (!Number.isNaN(roundNum)) {
        maxRoundWithActions = Math.max(maxRoundWithActions, roundNum)
      }
    }
  })

  let lastActionKey: string | null = null

  entries.forEach(([roundKey, actions], index) => {
    const roundNum = Number(roundKey)
    if (Number.isNaN(roundNum)) {
      return
    }
    const actionList = Array.isArray(actions) ? actions : []

    const hasNodeAction = actionList.some((entry) => {
      const token = entry?.[0]?.trim()
      if (!token) {
        return false
      }
      if (token === ORANGE_RESTART_LABEL) {
        return false
      }
      if (token.startsWith(DOWN_RESTART_PREFIX)) {
        return true
      }
      return !token.startsWith('重开:')
    })

    if (roundNum > maxRoundWithActions && !hasNodeAction) {
      return
    }

    const detectionKey = `检测回合${roundKey}`
    result[detectionKey] = ensureNextArray({
      recognition: 'Custom',
      custom_recognition: 'PureNum',
      custom_recognition_param: {
        roi: [...DETECTION_ROI],
        expected: `${roundNum}`,
      },
      text_doc: `回合${roundKey}`,
      focus: `当前：第${roundKey}回合`,
      next: [],
      on_error: [RESTART_NODE_KEY],
      timeout: 3000,
      post_delay: 2000,
    })

    const nextRoundDetection =
      index < entries.length - 1 ? `检测回合${entries[index + 1][0]}` : null

    const firstToken = actionList
      .find((entry) => {
        const token = entry?.[0]?.trim()
        return token && token.length > 0
      })?.[0]
      ?.trim()

    if (roundsWithOrangeRestart.has(roundKey)) {
      ensureNext(result, detectionKey, `第${roundKey}回合橙星检测`)
    } else if (firstToken && firstToken.includes('检测')) {
      ensureNext(result, detectionKey, `回合${roundKey}行动1`)
    } else if (firstToken && firstToken.startsWith('重开:')) {
      if (firstToken === ORANGE_RESTART_LABEL) {
        ensureNext(result, detectionKey, `第${roundKey}回合橙星检测`)
      } else if (firstToken === RESTART_FULL_LABEL) {
        ensureNext(result, detectionKey, RESTART_FULL_TARGET)
      } else if (firstToken === RESTART_MANUAL_LABEL) {
        ensureNext(result, detectionKey, RESTART_NODE_KEY)
      } else if (firstToken.startsWith(DOWN_RESTART_PREFIX)) {
        ensureNext(result, detectionKey, `回合${roundKey}行动1`)
      } else {
        ensureNext(result, detectionKey, RESTART_NODE_KEY)
      }
    } else if (hasNodeAction) {
      ensureNext(result, detectionKey, `回合${roundKey}行动1`)
    } else if (nextRoundDetection) {
      ensureNext(result, detectionKey, nextRoundDetection)
    }

    if (roundsWithOrangeRestart.has(roundKey)) {
      const orangeKey = `第${roundKey}回合橙星检测`
      const orangeConfig = ensureNextArray(
        cloneConfig(ORANGE_DETECTION_TEMPLATE) ?? { next: [] },
      )
      orangeConfig.text_doc = `第${roundKey}回合橙星检测`
      orangeConfig.focus = `第${roundKey}回合有橙星`
      orangeConfig.next = [`回合${roundKey}行动1`]
      result[orangeKey] = orangeConfig
    }

    let currentActionKey: string | null = detectionKey
    let actualActionIndex = 1

    actionList.forEach((entry) => {
      const token = entry?.[0]?.trim()
      if (!token) {
        return
      }

      if (token === ORANGE_RESTART_LABEL) {
        return
      }

      if (token.startsWith(DOWN_RESTART_PREFIX)) {
        const position = parseDownRestartPosition(token)
        const actionKey = `回合${roundKey}行动${actualActionIndex}`
        const downConfig = ensureNextArray({
          text_doc: `${position}号位阵亡检测`,
          action: 'Custom',
          custom_action: 'DownRestart',
          custom_action_param: {
            node: actionKey,
            position,
          },
        })
        result[actionKey] = downConfig
        if (currentActionKey) {
          ensureNext(result, currentActionKey, actionKey)
        }
        currentActionKey = actionKey
        lastActionKey = actionKey
        actualActionIndex += 1
        return
      }

      if (token.startsWith('重开:')) {
        const current = currentActionKey ? result[currentActionKey] : undefined
        if (token === RESTART_FULL_LABEL) {
          if (current) {
            const original = current.next ? [...current.next] : []
            const newNext = [
              RESTART_FULL_TARGET,
              ...original.filter((item) => item !== RESTART_FULL_TARGET),
            ]
            current.next = newNext
          }
        } else if (token === RESTART_MANUAL_LABEL) {
          if (current) {
            current.next = [RESTART_NODE_KEY]
          }
        }
        return
      }

      const actionKey = `回合${roundKey}行动${actualActionIndex}`

      if (token.startsWith('额外:')) {
        const extra = handleExtraAction(token, delays)
        if (!extra) {
          return
        }
        const config = ensureNextArray(extra)
        applyDelayFromToken(config, token, delays)
        result[actionKey] = config
      } else {
        const templateKey = templateKeyFromToken(token)
        const baseConfig = cloneConfig(
          templateKey ? ACTION_TEMPLATES[templateKey] : undefined,
        ) ?? {
          action: 'Click',
          post_delay:
            resolveDelayForTemplate(templateKey, delays) ??
            DEFAULT_SIMING_ATTACK_DELAY,
        }
        const config = ensureNextArray(baseConfig)
        config.text_doc = token
        applyDelayFromToken(config, token, delays)
        result[actionKey] = config
      }

      if (currentActionKey) {
        ensureNext(result, currentActionKey, actionKey)
      }
      currentActionKey = actionKey
      lastActionKey = actionKey
      actualActionIndex += 1
    })

    if (currentActionKey && currentActionKey !== detectionKey) {
      ensureNext(result, currentActionKey, '抄作业战斗胜利')
      if (nextRoundDetection) {
        ensureNext(result, currentActionKey, nextRoundDetection)
      }
    } else if (nextRoundDetection) {
      ensureNext(result, detectionKey, nextRoundDetection)
    }
  })

  if (lastActionKey) {
    ensureNext(result, lastActionKey, '抄作业战斗胜利')
  }

  result[RESTART_NODE_KEY] = ensureNextArray(
    cloneConfig(RESTART_NODE) ?? { next: [] },
  )

  return result
}

function handleExtraAction(
  token: string,
  delays: SimingActionDelays,
): SimingActionConfig | undefined {
  const [, raw] = token.split(':', 2)
  if (!raw) {
    return undefined
  }

  if (raw === '左侧目标') {
    return cloneConfig(TARGET_LEFT_ACTION)
  }
  if (raw === '右侧目标') {
    return cloneConfig(TARGET_RIGHT_ACTION)
  }
  if (raw.startsWith('等待')) {
    const parts = token.split(':')
    const parsed = Number(parts[2])
    const waitMs = Number.isFinite(parsed) ? parsed : 0
    return {
      text_doc: '等待',
      focus: '等待' + waitMs + 'ms',
      post_delay: waitMs,
    }
  }

  const special = cloneConfig(EXTRA_ACTION_TEMPLATES[raw])
  if (special) {
    return special
  }

  const templateKey = templateKeyFromToken(raw)
  const config = cloneConfig(
    templateKey ? ACTION_TEMPLATES[templateKey] : undefined,
  )
  const override = resolveDelayForTemplate(templateKey, delays)
  if (config) {
    config.text_doc = '再动' + raw
    config.focus = '再次行动:' + raw
    if (override !== undefined) {
      config.post_delay = override
    }
    return config
  }

  if (override !== undefined) {
    return {
      text_doc: raw,
      focus: raw,
      post_delay: override,
    }
  }

  return {
    text_doc: raw,
    focus: raw,
  }
}

function ensureNext(map: SimingActionMap, fromKey: string, toKey: string) {
  if (!map[fromKey]) {
    map[fromKey] = { next: [] }
  }
  const entry = map[fromKey]
  if (!entry.next) {
    entry.next = []
  }
  if (!entry.next.includes(toKey)) {
    entry.next.push(toKey)
  }
}

function ensureNextArray(config: SimingActionConfig): SimingActionConfig {
  if (!config.next) {
    config.next = []
  }
  return config
}

export function simingActionsToRoundActions(
  simingActions: CopilotDocV1.SimingActionMap,
): RoundActionsInput {
  const roundMap: Record<string, string[][]> = {}
  const actionEntries = Object.entries(simingActions)
    .map(([key, config]) => {
      const match = key.match(/^回合(\d+)行动(\d+)$/)
      if (!match) {
        return null
      }
      return {
        key,
        roundKey: match[1],
        order: Number(match[2]),
        config,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) =>
      a.roundKey === b.roundKey
        ? a.order - b.order
        : Number(a.roundKey) - Number(b.roundKey),
    )

  actionEntries.forEach(({ roundKey, config }) => {
    if (!roundMap[roundKey]) {
      roundMap[roundKey] = []
    }
    const tokens = roundMap[roundKey]
    const token = inferSimingToken(config)
    if (token) {
      tokens.push([token])
    }
    const next = (config.next ?? []).filter((item) => item !== '史子眇sp')
    if (next.includes(RESTART_FULL_TARGET)) {
      tokens.push([RESTART_FULL_LABEL])
    }
    if (next.includes(RESTART_MANUAL_TARGET)) {
      tokens.push([RESTART_MANUAL_LABEL])
    }
  })

  Object.entries(simingActions).forEach(([key, config]) => {
    const match = key.match(/^检测回合(\d+)$/)
    if (!match) {
      return
    }
    const roundKey = match[1]
    if (!roundMap[roundKey]) {
      roundMap[roundKey] = []
    }
    const tokens = roundMap[roundKey]
    const next = (config.next ?? []).filter((item) => item !== '史子眇sp')
    if (
      next.includes(RESTART_FULL_TARGET) &&
      !tokens.some((entry) => entry[0] === RESTART_FULL_LABEL)
    ) {
      tokens.unshift([RESTART_FULL_LABEL])
    }
    if (
      next.includes(RESTART_MANUAL_TARGET) &&
      !tokens.some((entry) => entry[0] === RESTART_MANUAL_LABEL)
    ) {
      tokens.unshift([RESTART_MANUAL_LABEL])
    }
    const orangeKey = `第${roundKey}回合橙星检测`
    if (
      next.includes(orangeKey) &&
      !tokens.some((entry) => entry[0] === ORANGE_RESTART_LABEL)
    ) {
      tokens.unshift([ORANGE_RESTART_LABEL])
    }
  })

  return roundMap
}

function inferSimingToken(
  action: CopilotDocV1.SimingAction,
): string | undefined {
  const text = action.textDoc?.trim()
  if (text && /^\\d[普大下]$/.test(text)) {
    return text
  }
  if (text && text.startsWith('再动')) {
    const payload = text.slice(2)
    return payload ? `额外:${payload}` : undefined
  }
  if (text === '等待') {
    const wait = action.postDelay ?? action.rearDelay ?? 0
    return `额外:等待:${Math.max(0, wait || 0)}`
  }
  if (text === '左侧目标') {
    return '额外:左侧目标'
  }
  if (text === '右侧目标') {
    return '额外:右侧目标'
  }
  if (text === '吕布') {
    return '额外:吕布'
  }
  if (text === '开自动' || text === '开启自动战斗') {
    return '额外:开自动'
  }
  if (text === '额外:史子眇sp') {
    return '额外:史子眇sp'
  }
  if (text && text.endsWith('号位阵亡检测')) {
    const digit = text.charAt(0)
    return `重开:检测${digit}号位阵亡`
  }
  if (action.customAction === 'DownRestart') {
    const position = Number(action.customActionParam?.position)
    const safePosition =
      Number.isFinite(position) && position >= 1 ? position : 1
    return `重开:检测${safePosition}号位阵亡`
  }
  if (text) {
    return text
  }
  if (action.action) {
    return action.action
  }
  return undefined
}

function sanitizeSimingActionDelays(
  delays: SimingActionDelays | undefined,
): SimingActionDelays {
  const normalize = (value: number | undefined, fallback: number) => {
    const numberLike = Number(value)
    if (!Number.isFinite(numberLike) || numberLike < 0) {
      return fallback
    }
    return Math.round(numberLike)
  }
  return {
    attack: normalize(delays?.attack, DEFAULT_SIMING_ATTACK_DELAY),
    ultimate: normalize(delays?.ultimate, DEFAULT_SIMING_ULTIMATE_DELAY),
    defense: normalize(delays?.defense, DEFAULT_SIMING_DEFENSE_DELAY),
  }
}

export function toSimingOperation(
  baseOperation: CopilotOperationLoose,
  editorOperation: EditorOperation,
): SimingOperation {
  const roundActions = editorActionsToRoundActions(editorOperation.actions)
  const delays = sanitizeSimingActionDelays(
    editorOperation.simingActionDelays ?? DEFAULT_SIMING_ACTION_DELAYS,
  )
  const actions = buildRoundNodes(roundActions, delays)

  const cloned = JSON.parse(
    JSON.stringify(baseOperation),
  ) as CopilotOperationLoose

  const rest = { ...cloned } as Record<string, unknown>
  delete rest.actions
  delete rest.siming_actions
  delete rest.simingActions

  return {
    ...(rest as Omit<CopilotOperationLoose, 'actions'>),
    actions,
  }
}

// Remote generator: delegate Siming JSON building to MaaYuan-SiMing backend
export async function toSimingOperationRemote(
  baseOperation: CopilotOperationLoose,
  editorOperation: EditorOperation,
  opts?: { level?: Level },
): Promise<SimingOperation> {
  // Prepare round actions from editor state
  const roundActions = editorActionsToRoundActions(editorOperation.actions)

  // Normalize delays to strings as MaaYuan-SiMing expects string inputs
  const delays = sanitizeSimingActionDelays(
    editorOperation.simingActionDelays ?? DEFAULT_SIMING_ACTION_DELAYS,
  )
  const stageName =
    (baseOperation as any).stageName ?? (baseOperation as any).stage_name ?? ''
  const payload: any = {
    // 按新规则：优先使用 catTwo；若无则回退 stageName / 占位
    level_name: (opts?.level?.catTwo ?? stageName) || 'generated_config',
    level_type: '',
    // 按新规则：识别名同样使用 catTwo（若无则保留为空，稍后可能被兜底逻辑覆盖）
    level_recognition_name: opts?.level?.catTwo ?? '',
    difficulty: '',
    // 洞窟时由下方逻辑设置为 catThree
    cave_type: '',
    lantai_nav: 'true',
    attack_delay: String(delays.attack),
    ult_delay: String(delays.ultimate),
    defense_delay: String(delays.defense),
    actions: roundActions,
  }

  // 映射：洞窟 -> level_type=洞窟，cave_type 使用三级分类（catThree）
  if (opts?.level && opts.level.catOne === '洞窟') {
    payload.level_type = '洞窟'
    payload.cave_type = opts.level.catThree ?? ''
  }

  // 映射：level_recognition_name 统一使用 catTwo（若存在）
  if (opts?.level?.catTwo) {
    payload.level_recognition_name = opts.level.catTwo
  }

  // 主线、白鹄、活动（有分级）、洞窟、其他类目自动映射 level_type
  if (opts?.level?.catOne === '主线') {
    payload.level_type = '主线'
  } else if (opts?.level?.catOne === '白鹄') {
    payload.level_type = '白鹄'
  } else if (opts?.level?.catOne === '活动') {
    payload.level_type = '活动有分级'
    // 难度映射：优先“普通”，否则“困难”，未知则留空
    const diff =
      (editorOperation as any).difficulty ?? (baseOperation as any).difficulty
    if (typeof diff === 'number') {
      const hasRegular =
        (diff & OpDifficultyBitFlag.REGULAR) === OpDifficultyBitFlag.REGULAR
      const hasHard =
        (diff & OpDifficultyBitFlag.HARD) === OpDifficultyBitFlag.HARD
      if (hasRegular) {
        payload.difficulty = '普通'
      } else if (hasHard) {
        payload.difficulty = '困难'
      }
    } else if (diff === OpDifficulty.REGULAR) {
      payload.difficulty = '普通'
    } else if (diff === OpDifficulty.HARD) {
      payload.difficulty = '困难'
    }
  } else if (
    opts?.level?.catOne === '兰台' ||
    opts?.level?.catOne === '地宫' ||
    opts?.level?.catOne === '家具' ||
    opts?.level?.catOne === '其他'
  ) {
    // 映射：兰台/地宫/家具/其他 -> level_type=其他，且需要难度
    payload.level_type = '其他'
    const diff =
      (editorOperation as any).difficulty ?? (baseOperation as any).difficulty
    if (typeof diff === 'number') {
      const hasRegular =
        (diff & OpDifficultyBitFlag.REGULAR) === OpDifficultyBitFlag.REGULAR
      const hasHard =
        (diff & OpDifficultyBitFlag.HARD) === OpDifficultyBitFlag.HARD
      if (hasRegular) {
        payload.difficulty = '普通'
      } else if (hasHard) {
        payload.difficulty = '困难'
      }
    } else if (diff === OpDifficulty.REGULAR) {
      payload.difficulty = '普通'
    } else if (diff === OpDifficulty.HARD) {
      payload.difficulty = '困难'
    }
  }

  // 兜底：当未匹配到 Level（或 Level 不包含 catOne/catTwo），尝试从关卡名中解析洞窟与左右
  if (!payload.level_type) {
    const name = String(stageName || '')
    if (name.includes('洞窟')) {
      payload.level_type = '洞窟'
      const m = name.match(/洞窟[-_\s]*([左右])/)
      if (m && (m[1] === '左' || m[1] === '右')) {
        payload.cave_type = m[1]
      }
    }
  }

  // 进一步兜底：从关卡名推断 主线/白鹄/活动/其他，并尽力提取识别名与难度
  if (!payload.level_type) {
    const raw = String(stageName || '')
    const stripBrackets = (s: string) => s.replace(/\(.*?\)/g, '')
    const splitParts = (s: string) =>
      stripBrackets(s)
        .split(/[-_]/)
        .map((p) => p.trim())
        .filter(Boolean)
    const parts = splitParts(raw)
    const lastPart = (() => {
      let last = parts[parts.length - 1] || ''
      if (last === '左' || last === '右') {
        last = parts[parts.length - 2] || last
      }
      return last
    })()

    if (raw.includes('主线')) {
      payload.level_type = '主线'
    } else if (raw.includes('白鹄')) {
      payload.level_type = '白鹄'
    } else if (raw.includes('活动')) {
      payload.level_type = '活动有分级'
      // 识别名优先已由 catTwo 设置，兜底时不再强制从关卡名推断
      if (!payload.difficulty) {
        if (raw.includes('普通')) payload.difficulty = '普通'
        else if (raw.includes('困难') || raw.includes('高难'))
          payload.difficulty = '困难'
      }
    } else {
      // 其他：识别名保持 catTwo 或留空
    }
  }

  const baseUrl =
    (import.meta as any).env?.VITE_SIMING_BASE_URL ||
    (typeof process !== 'undefined' &&
      (process as any).env?.VITE_SIMING_BASE_URL) ||
    'http://127.0.0.1:49481'

  const resp = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Siming生成接口失败: ${resp.status} ${text}`)
  }

  const data: { content?: string } = await resp.json()
  if (!data?.content) {
    throw new Error('Siming生成接口返回空内容')
  }

  let actions: SimingActionMap
  try {
    actions = JSON.parse(data.content)
  } catch (e) {
    throw new Error('解析Siming生成结果失败: ' + (e as Error).message)
  }

  const cloned = JSON.parse(
    JSON.stringify(baseOperation),
  ) as CopilotOperationLoose
  const rest = { ...cloned } as Record<string, unknown>
  delete rest.actions
  delete rest.siming_actions
  delete rest.simingActions

  return {
    ...(rest as Omit<CopilotOperationLoose, 'actions'>),
    actions,
  }
}
