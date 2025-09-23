import {
  RoundActionsInput,
  editorActionsToRoundActions,
} from './action/roundMapping'
import { EditorOperation } from './editor-state'
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
  template?: string
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
    begin: [77, 991, 10, 1],
    end: [77, 670, 10, 1],
    post_delay: 5000,
    duration: 800,
  },
  '1号位下拉': {
    action: 'Swipe',
    begin: [73, 985, 1, 1],
    end: [73, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '1号位普攻': {
    action: 'Click',
    target: [56, 960, 58, 62],
    post_delay: 3000,
  },
  '2号位上拉': {
    action: 'Swipe',
    begin: [220, 996, 1, 1],
    end: [225, 668, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '2号位下拉': {
    action: 'Swipe',
    begin: [221, 975, 1, 1],
    end: [221, 1251, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '2号位普攻': {
    action: 'Click',
    target: [180, 959, 76, 83],
    post_delay: 3000,
  },
  '3号位上拉': {
    action: 'Swipe',
    begin: [357, 975, 1, 1],
    end: [357, 714, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '3号位下拉': {
    action: 'Swipe',
    begin: [357, 975, 1, 1],
    end: [357, 1237, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '3号位普攻': {
    action: 'Click',
    target: [357, 975, 10, 10],
    post_delay: 3000,
  },
  '4号位上拉': {
    action: 'Swipe',
    begin: [496, 980, 1, 1],
    end: [496, 679, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '4号位下拉': {
    action: 'Swipe',
    begin: [496, 985, 1, 1],
    end: [496, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '4号位普攻': {
    action: 'Click',
    target: [496, 980, 10, 10],
    post_delay: 3000,
  },
  '5号位上拉': {
    action: 'Swipe',
    begin: [646, 987, 1, 1],
    end: [642, 700, 1, 1],
    post_delay: 5000,
    duration: 800,
  },
  '5号位下拉': {
    action: 'Swipe',
    begin: [646, 985, 1, 1],
    end: [646, 1258, 1, 1],
    post_delay: 3000,
    duration: 800,
  },
  '5号位普攻': {
    action: 'Click',
    target: [646, 987, 10, 10],
    post_delay: 3000,
  },
}

const TARGET_LEFT_ACTION: SimingActionConfig = {
  text_doc: '左侧目标',
  action: 'Click',
  target: [154, 648, 1, 1],
  post_delay: 2000,
  duration: 800,
}

const TARGET_RIGHT_ACTION: SimingActionConfig = {
  text_doc: '右侧目标',
  action: 'Click',
  target: [603, 413, 18, 21],
  post_delay: 2000,
  duration: 800,
}

const DETECTION_ROI: Readonly<[number, number, number, number]> = [
  585, 28, 90, 65,
]

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

function buildRoundNodes(roundActions: RoundActionsInput): SimingActionMap {
  const entries = Object.entries(roundActions)
    .filter(([round]) => !Number.isNaN(Number(round)))
    .sort(([a], [b]) => Number(a) - Number(b))

  const result: SimingActionMap = {}
  const totalRounds = entries.length
  let lastActionKey: string | null = null

  entries.forEach(([roundKey, actions], roundIndex) => {
    const detectionKey = `检测回合${roundKey}`
    result[detectionKey] = {
      recognition: 'OCR',
      expected: `回合${roundKey}`,
      roi: [...DETECTION_ROI],
      text_doc: `回合${roundKey}`,
      post_delay: 2000,
      next: [],
    }

    let currentKey: string | null = detectionKey
    const actionList = Array.isArray(actions) ? actions : []

    actionList.forEach((entry, index) => {
      const token = entry?.[0]?.trim()
      if (!token) {
        return
      }

      const actionKey = `回合${roundKey}行动${index + 1}`

      if (token.startsWith('额外:')) {
        const extra = handleExtraAction(token)
        if (!extra) {
          return
        }
        result[actionKey] = ensureNextArray(extra)
        if (currentKey) {
          ensureNext(result, currentKey, actionKey)
        }
        currentKey = actionKey
        lastActionKey = actionKey
        return
      }

      if (token.startsWith('重开:')) {
        const targetNode = token.endsWith('全灭')
          ? '抄作业全灭重开'
          : RESTART_NODE_KEY
        if (currentKey) {
          ensureNext(result, currentKey, targetNode)
          if (index < actionList.length - 1) {
            ensureNext(result, currentKey, `回合${roundKey}行动${index + 2}`)
          } else if (roundIndex < totalRounds - 1) {
            ensureNext(
              result,
              currentKey,
              `检测回合${entries[roundIndex + 1][0]}`,
            )
          }
        }
        return
      }

      const templateKey = templateKeyFromToken(token)
      const config = ensureNextArray(
        cloneConfig(
          templateKey ? ACTION_TEMPLATES[templateKey] : undefined,
        ) ?? {
          action: 'Click',
          post_delay: 3000,
        },
      )
      config.text_doc = token
      result[actionKey] = config

      if (currentKey) {
        ensureNext(result, currentKey, actionKey)
      }
      currentKey = actionKey
      lastActionKey = actionKey

      if (index === actionList.length - 1 && roundIndex < totalRounds - 1) {
        ensureNext(result, actionKey, `检测回合${entries[roundIndex + 1][0]}`)
      }
    })

    if (actionList.length === 0 && roundIndex < totalRounds - 1) {
      ensureNext(result, detectionKey, `检测回合${entries[roundIndex + 1][0]}`)
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

function handleExtraAction(token: string): SimingActionConfig | undefined {
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
    const waitMs = Number(parts[2])
    return {
      text_doc: '等待',
      post_delay: Number.isFinite(waitMs) ? waitMs : 0,
    }
  }

  const templateKey = templateKeyFromToken(raw)
  const config = cloneConfig(
    templateKey ? ACTION_TEMPLATES[templateKey] : undefined,
  )
  if (config) {
    config.text_doc = `再动${raw}`
    return config
  }

  return {
    text_doc: raw,
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

export function toSimingOperation(
  baseOperation: CopilotOperationLoose,
  editorOperation: EditorOperation,
): SimingOperation {
  const roundActions = editorActionsToRoundActions(editorOperation.actions)
  const actions = buildRoundNodes(roundActions)

  const cloned = JSON.parse(
    JSON.stringify(baseOperation),
  ) as CopilotOperationLoose
  const { actions: _ignored, ...rest } = cloned

  return {
    ...rest,
    actions,
  }
}
