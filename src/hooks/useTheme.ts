import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'high-contrast'

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

  // 处理副作用：根据 theme 状态修改 body 的类名
  useEffect(() => {
    const body = document.body
    const root = document.documentElement

    // 1. 清理所有相关类名
    body.classList.remove('bp4-dark', 'dark', 'high-contrast-theme')
    root.classList.remove('dark')

    // 2. 根据当前主题添加对应类名
    if (theme === 'dark') {
      body.classList.add('bp4-dark', 'dark')
      root.classList.add('dark')
    } else if (theme === 'high-contrast') {
      body.classList.add('bp4-dark', 'dark', 'high-contrast-theme')
      root.classList.add('dark')
    }
    // light 模式下不添加任何类名
  }, [theme])

  return { theme, setTheme }
}
