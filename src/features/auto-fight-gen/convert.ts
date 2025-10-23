import { type CellObject, read, utils } from 'xlsx'

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

// 近似主题色对应的十六进制（仅用于前端色块展示）
const themeColorHexMap: Record<number, string> = {
  0: '#FFFFFF',
  1: '#000000',
  2: '#FFFFFF',
  3: '#4F81BD',
  4: '#4F81BD',
  5: '#C0504D',
  6: '#9BBB59',
  7: '#8064A2',
  8: '#4F81BD',
  9: '#ED7D31',
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

export const rgbToNamedColor = (r: number, g: number, b: number): string => {
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
  if (h < 0) h += 360

  const s = max === 0 ? 0 : delta / max
  const v = max

  const sat = s * 255
  const val = v * 255

  // 黑/白/灰优先（与原阈值兼容）
  if (sat <= 43 && val <= 46) return NAMED_COLORS.黑
  if (sat <= 30 && val >= 221) return NAMED_COLORS.白
  if (sat <= 43 && val > 46 && val < 221) return NAMED_COLORS.灰

  // 使用 0..360 的 Hue 统一映射到常用中文色
  // 近似区间：红[0,20]|[345,360] 橙(20,46] 黄(46,68] 绿(68,164] 蓝(164,248] 紫(248,345]
  if (h <= 20 || h > 345) return NAMED_COLORS.红
  if (h <= 46) return NAMED_COLORS.橙
  if (h <= 68) return NAMED_COLORS.黄
  if (h <= 164) return NAMED_COLORS.绿
  if (h <= 248) return NAMED_COLORS.蓝
  return NAMED_COLORS.紫
}

const argbToRgb = (argb: string): [number, number, number] => {
  const hex = parseInt(argb, 16)
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return [r, g, b]
}

export const hexToNamedColor = (hex: string): string => {
  const noHash = hex.startsWith('#') ? hex.slice(1) : hex
  if (noHash.length !== 6) return '白'
  const r = parseInt(noHash.slice(0, 2), 16)
  const g = parseInt(noHash.slice(2, 4), 16)
  const b = parseInt(noHash.slice(4, 6), 16)
  return rgbToNamedColor(r, g, b)
}

const rgbTupleToHex = (rgb: [number, number, number]): string =>
  `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1]
    .toString(16)
    .padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`.toUpperCase()

// 读取单元格填充颜色（优先 rgb，其次 theme），返回 RGB 十六进制字符串
const getCellFillRgbHex = (cell: CellObject): string | null => {
  const anyCell = cell as unknown as {
    s?: {
      fgColor?: { rgb?: string; theme?: number }
      fill?: {
        fgColor?: { rgb?: string; theme?: number }
        bgColor?: { rgb?: string; theme?: number }
      }
    }
  }
  const s = anyCell?.s
  const tryColors = [
    s?.fgColor?.rgb,
    s?.fill?.fgColor?.rgb,
    s?.fill?.bgColor?.rgb,
  ].filter(Boolean) as string[]
  if (tryColors.length > 0) {
    const [r, g, b] = argbToRgb(tryColors[0]!)
    return rgbTupleToHex([r, g, b])
  }
  const theme =
    s?.fgColor?.theme ?? s?.fill?.fgColor?.theme ?? s?.fill?.bgColor?.theme
  if (typeof theme === 'number') {
    return themeColorHexMap[theme] ?? null
  }
  return null
}

const pickCellColor = (cell: CellObject, config: AutoFightConfig): string => {
  if (!config.useColor) {
    return ''
  }

  // 文本模式：前缀以 colorList 中的任意标识开头（允许使用字母令牌）
  if (config.colorType === 'text') {
    const raw = typeof cell.v === 'string' ? cell.v.trim() : ''
    if (!raw) return ''
    const matched = config.colorList.find((token) => raw.startsWith(token))
    return matched ?? ''
  }

  // 填充模式：使用 paletteHexList 来确保“按原色块”精准区分
  const fillHex = getCellFillRgbHex(cell)
  if (!fillHex) return ''
  const palette = (config.paletteHexList ?? []).map((h) => h.toUpperCase())
  const tokens =
    config.colorTokenList && config.colorTokenList.length > 0
      ? config.colorTokenList
      : config.colorList
  const idx = palette.indexOf(fillHex.toUpperCase())
  if (idx >= 0 && tokens[idx]) {
    // 返回单字符令牌（例如 A/B/C/...），便于后续解析与最短旋转
    return tokens[idx]
  }
  return ''
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

// 提取 Excel 中出现的命名颜色（仅统计含内容的单元格）
export const detectXlsxColors = (
  arrayBuffer: ArrayBuffer,
  overrides?: Partial<AutoFightConfig>,
): string[] => {
  // 强制启用颜色解析做检测，但颜色来源遵循 overrides 中的 colorType
  const config = normalizeConfig({ useColor: true, ...overrides })
  const workbook = read(arrayBuffer, { type: 'array', cellStyles: true })
  const [sheetName] = workbook.SheetNames
  if (!sheetName) {
    return []
  }
  const sheet = workbook.Sheets[sheetName]
  const rangeRef = sheet['!ref']
  if (!rangeRef) {
    return []
  }
  const range = utils.decode_range(rangeRef)
  const set = new Set<string>()

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if (config.useHeader && r === range.s.r) continue
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellAddress = utils.encode_cell({ r, c })
      const cell = sheet[cellAddress] as CellObject | undefined
      if (!cell) continue
      const rawText =
        cell.v === undefined || cell.v === null ? '' : String(cell.v).trim()
      // 没有文本也允许统计，只要单元格存在填充色
      const fillHex = getCellFillRgbHex(cell)
      if (fillHex) {
        // 转命名色以对齐生成逻辑
        const hexNoHash = fillHex.replace('#', '')
        const r = parseInt(hexNoHash.slice(0, 2), 16)
        const g = parseInt(hexNoHash.slice(2, 4), 16)
        const b = parseInt(hexNoHash.slice(4, 6), 16)
        const colorName = rgbToNamedColor(r, g, b)
        if (colorName) set.add(colorName)
        continue
      }
      if (rawText) {
        const color = pickCellColor(cell, config)
        if (color) set.add(color)
      }
    }
  }

  return Array.from(set)
}

export interface DetectedColor {
  label: string
  rgb: string
}

// 提取 Excel 中出现的颜色调色板（包含色块展示所需的 RGB）
export const detectXlsxPalette = (
  arrayBuffer: ArrayBuffer,
  overrides?: Partial<AutoFightConfig>,
): DetectedColor[] => {
  const config = normalizeConfig({ useColor: true, ...overrides })
  const workbook = read(arrayBuffer, { type: 'array', cellStyles: true })
  const [sheetName] = workbook.SheetNames
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  const rangeRef = sheet['!ref']
  if (!rangeRef) return []
  const range = utils.decode_range(rangeRef)

  const map = new Map<string, DetectedColor>() // key: rgb hex

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if (config.useHeader && r === range.s.r) continue
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellAddress = utils.encode_cell({ r, c })
      const cell = sheet[cellAddress] as CellObject | undefined
      if (!cell) continue
      const fillHex = getCellFillRgbHex(cell)
      if (!fillHex) continue
      const hexNoHash = fillHex.replace('#', '')
      const r8 = parseInt(hexNoHash.slice(0, 2), 16)
      const g8 = parseInt(hexNoHash.slice(2, 4), 16)
      const b8 = parseInt(hexNoHash.slice(4, 6), 16)
      const label = rgbToNamedColor(r8, g8, b8)
      if (!map.has(fillHex)) {
        map.set(fillHex, { label, rgb: fillHex })
      }
    }
  }

  return Array.from(map.values())
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
  const clockwiseDistance =
    (targetIndex - previousIndex + colors.length) % colors.length
  const counterDistance =
    (previousIndex - targetIndex + colors.length) % colors.length
  if (clockwiseDistance <= counterDistance) {
    return new Array(clockwiseDistance).fill('右侧目标')
  }
  return new Array(counterDistance).fill('左侧目标')
}

const parseActionsForRow = (
  row: string[],
  config: AutoFightConfig,
): ActionOrder => {
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
