import { atomWithStorage } from 'jotai/utils'

export type FilterMode = 'NONE' | 'PERFECT' | 'SUPPORT'
export type DisplayMode = 'GRAY' | 'HIDE'

// 拥有的干员列表
export const ownedOperatorsAtom = atomWithStorage<string[]>('maa_owned_operators', [])

// 筛选模式：完美阵容 / 允许助战 / 无
export const filterModeAtom = atomWithStorage<FilterMode>('maa_filter_mode', 'NONE')

// 显示模式：置灰 / 隐藏
export const displayModeAtom = atomWithStorage<DisplayMode>('maa_display_mode', 'GRAY')
