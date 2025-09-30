export type BasicActionSymbol = '普' | '大' | '下'

export type ChipVariant = 'warm' | 'danger' | 'info' | 'teal' | 'success' | 'neutral'

export const BASIC_ACTION_VARIANTS: Record<BasicActionSymbol, ChipVariant> = {
  普: 'warm',
  大: 'danger',
  下: 'info',
}

export const CHIP_VARIANT_DOT_CLASS: Record<ChipVariant, string> = {
  warm: 'bg-amber-400',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  teal: 'bg-cyan-500',
  success: 'bg-lime-500',
  neutral: 'bg-slate-400',
}

export const SLOT_KEYS = ['1', '2', '3', '4', '5'] as const

export type SlotKey = (typeof SLOT_KEYS)[number]

export interface TokenEntry {
  token: string
  index: number
}

export function extractSlotFromToken(rawToken: string): SlotKey | null {
  const token = rawToken.trim()
  if (!token) {
    return null
  }

  const baseMatch = token.match(/^([1-5])([普大下])$/)
  if (baseMatch) {
    return baseMatch[1] as SlotKey
  }

  if (token.startsWith('额外:')) {
    const payload = token.slice('额外:'.length)
    const againMatch = payload.match(/^([1-5])([普大下])$/)
    if (againMatch) {
      return againMatch[1] as SlotKey
    }

    return null
  }

  if (token.startsWith('重开:检测')) {
    const downMatch = token.match(/重开:检测([1-5])号位阵亡/)
    if (downMatch) {
      return downMatch[1] as SlotKey
    }
  }

  return null
}

export function groupTokensBySlot(actions: string[][]): {
  slotMap: Partial<Record<SlotKey, TokenEntry[]>>
  others: TokenEntry[]
} {
  const slotMap: Partial<Record<SlotKey, TokenEntry[]>> = {}
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
      slotMap[slot]!.push({ token, index })
      return
    }

    others.push({ token, index })
  })

  return { slotMap, others }
}

export function resolveChipVariant(rawToken: string): ChipVariant {
  const token = rawToken.trim()
  if (!token) {
    return 'neutral'
  }

  const baseMatch = token.match(/^([1-5])([普大下])$/)
  if (baseMatch) {
    const symbol = baseMatch[2] as BasicActionSymbol
    return BASIC_ACTION_VARIANTS[symbol]
  }

  if (token.startsWith('额外:')) {
    const extraPayload = token.slice('额外:'.length)
    const normalizedExtraPayload = extraPayload.toLowerCase()
    const againMatch = extraPayload.match(/^([1-5])([普大下])$/)
    if (againMatch) {
      const actionSymbol = againMatch[2] as BasicActionSymbol
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
