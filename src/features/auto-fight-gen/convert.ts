import { read, utils, type CellObject } from 'xlsx'

import {
  AutoFightConfig,
  actionMap,
  defaultAutoFightConfig,
  fightActionTemplates,
  operationMap,
} from './config'

const COLUMNS = ['1', '2', '3', '4', '5'] as const

type ActionOrder = Record<number, { action: string }>

type AutoFightNode = Record<string, unknown>

type AutoFightGraph = Record<string, AutoFightNode>

const ACTION_REGEX = /([^\d]*?)(\d)(\D)/g

const NAMED_COLORS = {
  黑: '黑',
  白: '白',
  灰: '灰',
  红: '红',
  橙: '橙',
  黄: '黄',
  绿: '绿',
  蓝: '蓝',
  紫: '紫',
} as const

const themeColorMap: Record<number, string> = {
  0: '白',
  1: '黑',
  2: '白',
  3: '蓝',
  4: '蓝',
  5: '红',
  6: '绿',
  7: '紫',
  8: '蓝',
  9: '橙',
}

const slideOperationToAction: Record<string, AutoFightNode> = {
  左侧目标: {
    text_doc: '左侧目标',
    action: 'Click',
    target: [154, 648, 1, 1],
    post_delay: 2000,
    duration: 800,
  },
  右侧目标: {
    text_doc: '右侧目标',
    action: 'Click',
    target: [603, 413, 18, 21],
    post_delay: 2000,
    duration: 800,
  },
  检测橙星: {
    text_doc: '检测橙星',
    recognition: 'ColorMatch',
    roi: [77, 167, 70, 70],
    method: 4,
    upper: [255, 255, 205],
    lower: [166, 140, 85],
    count: 1,
    order_by: 'Score',
    connected: true,
    action: 'Click',
    pre_delay: 2000,
  },
}

const restartNodeTemplate: AutoFightNode = {
  recognition: 'TemplateMatch',
  template: 'back.png',
  green_mask: true,
  threshold: 0.5,
  roi: [6, 8, 123, 112],
  action: 'Click',
  pre_delay: 2000,
  post_delay: 2000,
  next: ['抄作业确定左上角重开'],
  timeout: 20000,
}

const levelTypeToNextNode: Record<AutoFightConfig['levelType'], string> = {
  主线: '抄作业找到关卡-主线',
  洞窟: '抄作业进入关卡-洞窟',
  活动有分级: '抄作业找到关卡-活动分级',
  白鹄: '抄作业进入关卡-白鹄',
  其他: '抄作业找到关卡-OCR',
}

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizeConfig = (
  overrides?: Partial<AutoFightConfig>,
): AutoFightConfig => ({
  ...defaultAutoFightConfig,
  ...overrides,
})

const rgbToNamedColor = (r: number, g: number, b: number): string => {
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const delta = max - min

  let h = 0
  if (delta === 0) {
    h = 0
  } else if (max === rf) {
    h = 60 * (((gf - bf) / delta) % 6)
  } else if (max === gf) {
    h = 60 * ((bf - rf) / delta + 2)
  } else {
    h = 60 * ((rf - gf) / delta + 4)
  }
  if (h < 0) {
    h += 360
  }

  const s = max === 0 ? 0 : delta / max
  const v = max

  const sat = s * 255
  const val = v * 255

  if (sat <= 43 && val <= 46) return NAMED_COLORS.黑
  if (sat <= 30 && val >= 221) return NAMED_COLORS.白
  if (sat <= 43 && val > 46 && val < 221) return NAMED_COLORS.灰
  if ((h >= 0 && h <= 10) || (h >= 156 && h <= 180)) return NAMED_COLORS.红
  if (h >= 11 && h <= 23) return NAMED_COLORS.橙
  if (h >= 24 && h <= 34) return NAMED_COLORS.黄
  if (h >= 35 && h <= 82) return NAMED_COLORS.绿
  if (h >= 83 && h <= 124) return NAMED_COLORS.蓝
  if (h >= 125 && h <= 155) return NAMED_COLORS.紫
  return `${h.toFixed(2)} ${sat.toFixed(2)} ${val.toFixed(2)}`
}

const argbToRgb = (argb: string): [number, number, number] => {
  const hex = parseInt(argb, 16)
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return [r, g, b]
}

const pickCellColor = (
  cell: CellObject,
  config: AutoFightConfig,
): string => {
  if (!config.useColor) {
    return ''
  }

  if (config.colorType === 'text') {
    const raw = typeof cell.v === 'string' ? cell.v.trim() : ''
    if (!raw) {
      return ''
    }
    const matched = config.colorList.find((color) => raw.startsWith(color))
    return matched ?? ''
  }

  const style = cell.s as unknown as
    | { fgColor?: { rgb?: string; theme?: number } }
    | undefined
  const fgColor = style?.fgColor
  if (!fgColor) {
    return '白'
  }
  if (typeof fgColor.theme === 'number') {
    return themeColorMap[fgColor.theme] ?? '白'
  }
  if (fgColor.rgb) {
    const [r, g, b] = argbToRgb(fgColor.rgb)
    return rgbToNamedColor(r, g, b)
  }
  return '白'
}

const readSheetRows = (
  arrayBuffer: ArrayBuffer,
  config: AutoFightConfig,
): string[][] => {
  const workbook = read(arrayBuffer, { type: 'array', cellStyles: true })
  const [sheetName] = workbook.SheetNames
  if (!sheetName) {
    throw new Error('xlsx_no_sheet')
  }
  const sheet = workbook.Sheets[sheetName]
  const rangeRef = sheet['!ref']
  if (!rangeRef) {
    throw new Error('xlsx_empty')
  }
  const range = utils.decode_range(rangeRef)
  const rows: string[][] = []

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if (config.useHeader && r === range.s.r) {
      continue
    }
    const rowValues: string[] = []
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellAddress = utils.encode_cell({ r, c })
      const cell = sheet[cellAddress] as CellObject | undefined
      if (!cell || cell.v === undefined || cell.v === null) {
        rowValues.push('')
        continue
      }
      const rawText = String(cell.v).trim()
      if (!rawText) {
        rowValues.push('')
        continue
      }
      if (config.useColor) {
        const color = pickCellColor(cell, config)
        rowValues.push(`${color}${rawText}`)
      } else {
        rowValues.push(rawText)
      }
    }
    if (rowValues.some((value) => value !== '')) {
      rows.push(rowValues)
    }
  }

  return rows
}

const getActionTemplate = (actionCode: string) => {
  const position = actionCode[0]
  const actionType = actionCode[1]
  const key = `${position}号位${
    actionType === '普'
      ? '普攻'
      : actionType === '大'
        ? '上拉'
        : actionType === '下'
          ? '下拉'
          : 'O'
  }`
  return fightActionTemplates[key]
}

const getSlideOperations = (
  previousColor: string,
  targetColor: string,
  config: AutoFightConfig,
): string[] => {
  const colors = config.colorList
  const previousIndex = colors.indexOf(previousColor)
  const targetIndex = colors.indexOf(targetColor)
  if (previousIndex === -1 || targetIndex === -1) {
    return []
  }
  const clockwiseDistance = (targetIndex - previousIndex + colors.length) % colors.length
  const counterDistance = (previousIndex - targetIndex + colors.length) % colors.length
  if (clockwiseDistance <= counterDistance) {
    return new Array(clockwiseDistance).fill('右侧目标')
  }
  return new Array(counterDistance).fill('左侧目标')
}

const parseActionsForRow = (row: string[], config: AutoFightConfig): ActionOrder => {
  const actionOrder: ActionOrder = {}

  row.forEach((seq, idx) => {
    if (typeof seq !== 'string' || seq.trim() === '') {
      return
    }

    const normalized = seq
      .replace(/普攻/g, '普')
      .replace(/技能/g, '大')
      .replace(/防御/g, '防')

    const matches = Array.from(normalized.matchAll(ACTION_REGEX))
    matches.forEach((match) => {
      let operations = match[1]
      if (config.useColor && config.colorList.length > 0) {
        const expectedColor = matches[0]?.[1]?.[0]
        if (!operations || !config.colorList.includes(operations[0] ?? '')) {
          operations = (expectedColor ?? '') + operations
        }
      }
      const number = Number(match[2])
      const symbol = match[3]
      const actionType = actionMap[symbol] ?? '未知'
      if (actionType === '未知') {
        console.warn('未知的动作符号', symbol)
        return
      }
      const columnIndex = COLUMNS[idx] ?? String(idx + 1)
      actionOrder[number] = {
        action: `${operations}${columnIndex}${actionType}`,
      }
    })
  })

  return actionOrder
}

const setOperationAction = (
  actionOp: string,
  roundIndex: number,
  actionIndex: number,
  graph: AutoFightGraph,
  currentActionKey: string | null,
): { actionIndex: number; currentActionKey: string | null } => {
  if (actionOp === '未知') {
    console.warn('未知的操作符', actionOp)
    return { actionIndex, currentActionKey }
  }

  const actionKey = `回合${roundIndex}行动${actionIndex + 1}`
  const template = slideOperationToAction[actionOp]
  if (!template) {
    return { actionIndex, currentActionKey }
  }

  graph[actionKey] = cloneDeep(template)
  if (actionOp === '检测橙星') {
    if (currentActionKey && graph[currentActionKey]) {
      graph[currentActionKey].on_error = ['抄作业点左上角重开']
      graph[currentActionKey].timeout = 200
    } else {
      const detectorKey = `检测回合${roundIndex}`
      if (graph[detectorKey]) {
        graph[detectorKey].on_error = ['抄作业点左上角重开']
        graph[detectorKey].timeout = 200
      }
    }
  }

  if (currentActionKey && graph[currentActionKey]) {
    graph[currentActionKey].next = [actionKey]
  }

  return { actionIndex: actionIndex + 1, currentActionKey: actionKey }
}

const addRestartInfo = (graph: AutoFightGraph, config: AutoFightConfig) => {
  const nextNode = levelTypeToNextNode[config.levelType]
  graph['抄作业点左上角重开'] = {
    ...cloneDeep(restartNodeTemplate),
    next: ['抄作业确定左上角重开', nextNode],
  }

  if (config.levelType === '洞窟') {
    graph['抄作业进入关卡-洞窟'] =
      config.caveType === '左'
        ? {
            text_doc: '左',
            recognition: 'OCR',
            expected: '前往',
            roi: [237, 810, 82, 89],
            action: 'Click',
            target: [258, 833, 42, 39],
            pre_delay: 1500,
            next: ['抄作业战斗开始'],
            timeout: 20000,
          }
        : {
            text_doc: '右',
            recognition: 'OCR',
            expected: '前往',
            roi: [558, 804, 79, 89],
            action: 'Click',
            target: [581, 832, 41, 41],
            pre_delay: 1500,
            next: ['抄作业战斗开始'],
            timeout: 20000,
          }
  } else if (config.levelType === '活动有分级') {
    graph['抄作业找到关卡-活动分级'] = {
      recognition: 'OCR',
      expected: config.levelRecognitionName,
      roi: [0, 249, 720, 1030],
      action: 'Click',
      pre_delay: 1500,
      next: ['抄作业选择活动分级'],
      timeout: 20000,
    }
    graph['抄作业选择活动分级'] = {
      recognition: 'OCR',
      expected: config.difficulty,
      roi: [37, 351, 647, 491],
      pre_delay: 1500,
      action: 'Click',
      next: ['抄作业进入关卡'],
      timeout: 20000,
    }
  } else if (config.levelType !== '主线' && config.levelType !== '白鹄') {
    graph['抄作业找到关卡-OCR'] = {
      recognition: 'OCR',
      expected: config.levelRecognitionName,
      roi: [0, 249, 720, 1030],
      action: 'Click',
      pre_delay: 2000,
      next: ['抄作业战斗开始'],
      timeout: 20000,
    }
  }
}

export interface ConvertOptions extends Partial<AutoFightConfig> {}

export const convertXlsxToAutoFightJson = (
  arrayBuffer: ArrayBuffer,
  overrides?: ConvertOptions,
) => {
  const config = normalizeConfig(overrides)
  const rows = readSheetRows(arrayBuffer, config)
  if (!rows.length) {
    throw new Error('xlsx_no_content')
  }

  const graph: AutoFightGraph = {}
  let previousColor = ''

  rows.forEach((row, roundIdx) => {
    const round = roundIdx + 1
    const detectionKey = `检测回合${round}`
    graph[detectionKey] = {
      recognition: 'OCR',
      expected: `回合${round}`,
      roi: [585, 28, 90, 65],
      next: [`回合${round}行动1`],
      post_delay: config.roundPostDelay,
    }

    const actionOrder = parseActionsForRow(row, config)
    const sortedEntries = Object.entries(actionOrder).sort(
      ([a], [b]) => Number(a) - Number(b),
    )

    const totalActions = sortedEntries.reduce(
      (acc, [, action]) => acc + Math.max(action.action.length - 1, 0),
      0,
    )

    let actionIndex = 0
    let currentActionKey: string | null = null
    let progression = 0

    sortedEntries.forEach(([, action]) => {
      const directionsMatch = action.action.match(/^[^\d]+/)
      const directions = directionsMatch ? directionsMatch[0].split('') : []
      directions.forEach((direction) => {
        progression += 1
        const mapped = operationMap[direction] ?? '未知'
        if (config.useColor && config.colorList.includes(direction)) {
          if (!previousColor) {
            previousColor = direction
            return
          }
          if (previousColor === direction) {
            return
          }
          const slideOps = getSlideOperations(previousColor, direction, config)
          previousColor = direction
          slideOps.forEach((slideOp) => {
            const result = setOperationAction(
              slideOp,
              round,
              actionIndex,
              graph,
              currentActionKey,
            )
            actionIndex = result.actionIndex
            currentActionKey = result.currentActionKey
          })
        } else {
          const result = setOperationAction(
            mapped,
            round,
            actionIndex,
            graph,
            currentActionKey,
          )
          actionIndex = result.actionIndex
          currentActionKey = result.currentActionKey
        }
      })

      actionIndex += 1
      progression += 1

      const actionTemplate = getActionTemplate(action.action.slice(-2))
      if (!actionTemplate) {
        console.warn('未找到动作模板', action.action)
        return
      }

      const actionKey = `回合${round}行动${actionIndex}`
      graph[actionKey] = {
        ...cloneDeep(actionTemplate),
        text_doc: action.action.slice(-2),
      }

      if (currentActionKey && graph[currentActionKey]) {
        graph[currentActionKey].next = [actionKey]
      }

      currentActionKey = actionKey

      const isRoundLastAction =
        progression === totalActions && round < rows.length
      if (isRoundLastAction) {
        graph[actionKey].next = ['抄作业战斗胜利', `检测回合${round + 1}`]
      }
    })
  })

  addRestartInfo(graph, config)

  return JSON.stringify(graph, null, 2)
}
