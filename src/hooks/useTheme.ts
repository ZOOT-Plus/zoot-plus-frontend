import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect } from 'react'
import { IconName } from '@blueprintjs/core'

// 1. 定义主题的 ID 类型 (如果想完全动态，可以改为 string，但为了类型安全建议保留联合类型)
export type ThemeMode = 'light' | 'dark' | 'high-contrast'

// 2. 定义主题配置接口
interface ThemeDefinition {
  id: ThemeMode
  i18nKey: string // 对应 translations.json 中的键名
  icon: IconName
  classList: string[] // 该主题激活时需要添加到 body/html 的类名
}

// 3. 【核心配置】所有主题都在这里定义
// 以后要加新主题，只需在这里添加一项即可，无需修改逻辑代码
export const THEME_CONFIG: ThemeDefinition[] = [
  {
    id: 'light',
    i18nKey: 'light',
    icon: 'flash',
    classList: [], // 浅色模式通常不需要额外类名
  },
  {
    id: 'dark',
    i18nKey: 'dark',
    icon: 'moon',
    classList: ['bp4-dark', 'dark'],
  },
  {
    id: 'high-contrast',
    i18nKey: 'highContrast',
    icon: 'contrast',
    classList: ['bp4-dark', 'dark', 'high-contrast-theme'],
  },
]

// 辅助函数：获取所有主题可能用到的 CSS 类名（用于清理）
const ALL_THEME_CLASSES = Array.from(
  new Set(THEME_CONFIG.flatMap((t) => t.classList)),
)

// 获取系统默认主题
const getSystemTheme = (): ThemeMode => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

export const themeAtom = atomWithStorage<ThemeMode>('theme', getSystemTheme())

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom)

  useEffect(() => {
    const body = document.body
    const root = document.documentElement

    // 1. 暴力清理：移除所有主题相关类名
    body.classList.remove(...ALL_THEME_CLASSES)
    root.classList.remove(...ALL_THEME_CLASSES)

    // 2. 查找当前主题的配置
    const currentConfig = THEME_CONFIG.find((t) => t.id === theme)

    // 3. 应用当前主题的类名
    if (currentConfig && currentConfig.classList.length > 0) {
      body.classList.add(...currentConfig.classList)
      // 如果某些类名必须加在 html 标签上(如 tailwind 的 dark)，通常只加 dark
      if (currentConfig.classList.includes('dark')) {
        root.classList.add('dark')
      }
    }
  }, [theme])

  return { theme, setTheme }
}
