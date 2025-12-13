import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'high-contrast'

export function useTheme() {
  // 初始化状态：优先读取本地存储，如果没有则检测系统主题
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme')
    // 兼容旧数据的 boolean 或字符串
    if (saved === 'true' || saved === 'dark') return 'dark'
    if (saved === 'high-contrast') return 'high-contrast'
    if (saved === 'false' || saved === 'light') return 'light'

    // 如果没有本地记录，遵循系统偏好 (还原原有功能)
    // 检查是否为深色模式
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

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
      // 高对比度模式同时拥有 dark 的基础样式和 high-contrast 的覆盖样式
      body.classList.add('bp4-dark', 'dark', 'high-contrast-theme')
      root.classList.add('dark')
    }
    // light 模式下不添加任何类名

    // 3. 持久化存储
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
