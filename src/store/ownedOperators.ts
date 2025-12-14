// src/store/ownedOperators.ts
import { atomWithStorage } from 'jotai/utils'

export type FilterMode = 'NONE' | 'PERFECT' | 'SUPPORT'
export type DisplayMode = 'GRAY' | 'HIDE'

// 存储用户持有的干员名称列表
export const ownedOperatorsAtom = atomWithStorage<string[]>('maa-owned-operators', [])

// 筛选模式：无限制 | 完美阵容 (全有) | 允许助战 (缺1)
export const filterModeAtom = atomWithStorage<FilterMode>('maa-filter-mode', 'NONE')

// 显示模式：置灰 | 隐藏
export const displayModeAtom = atomWithStorage<DisplayMode>('maa-display-mode', 'GRAY')
