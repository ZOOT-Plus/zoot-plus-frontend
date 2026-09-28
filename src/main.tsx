import '@blueprintjs/core/lib/css/blueprint.css'
import './styles/blueprint-icons.css'
import '@blueprintjs/select/lib/css/blueprint-select.css'
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

import 'normalize.css'
import React, { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { ReactGA } from 'utils/react-ga'
import { Route, Routes } from 'react-router-dom'

import { registerSW } from 'virtual:pwa-register'

import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { ViewPage } from 'pages/view'
import { clearOutdatedSwrCache } from 'utils/swr'

import { i18n } from './i18n/i18n'

import { App } from './App'
import { AppLayout } from './layouts/AppLayout'
import { NotFoundPage } from './pages/404'
import { IndexPage } from './pages/index'
import './styles/blueprint.less'

import './styles/index.css'

Sentry.init({
  dsn: 'https://0a2bb44996194bb7aff8d0e32dcacb55@o1299554.ingest.sentry.io/6545242',
  integrations: [new BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 0.05,

  replaysSessionSampleRate: 0.001,
  replaysOnErrorSampleRate: 0.1,

  debug: import.meta.env.DEV,

  enabled: import.meta.env.PROD,
  beforeSend: (event) => {
    if (import.meta.env.DEV) return null
    return event
  },
})

ReactGA.initialize('G-K3MCHSLB5K')

// add platform class to root element
if (navigator.userAgent.includes('Win')) {
  document.documentElement.classList.add('platform--windows')
} else {
  document.documentElement.classList.add('platform--non-windows')
}

// ServiceWorker：纯在线性能缓存层（零预缓存、无离线兜底，配置见 vite.config.ts 的 VitePWA）。
// 更新采用 prompt 模式——新版本就绪时弹 Toast 由用户手动刷新，而非 autoUpdate 的自动刷新，
// 避免打断正在编辑器里作业的用户（editor2 自动存档间隔 5 分钟，未存档增量会丢失）
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh: () => {
      AppToaster.show({
        intent: 'primary',
        // prompt 模式下同一 waiting SW 只提示一次，Toast 必须常驻到用户处理为止：
        // 默认 5 秒超时会让用户错过入口，错过就只能等所有标签页关闭后新 SW 才能接管。
        // Blueprint 虽对 timeout<=0 标注 discouraged，但此处是必须由用户决策的持久提示，
        // 且 isCloseButtonShown 默认 true、action 点击自动关闭，均保留手动关闭途径
        timeout: 0,
        message: i18n.essentials.new_version_available,
        action: {
          text: i18n.essentials.refresh_page,
          onClick: () => updateSW(true),
        },
      })
    },
  })
}

clearOutdatedSwrCache()

// 将 maa-copilot-* / copilot-* 的 localStorage 数据迁移到 zoot-plus-* 前缀
;(function migrateStorageKeys() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key) continue
    const newKey = key.replace(/^maa-copilot-/, 'zoot-plus-').replace(/^copilot-/, 'zoot-plus-')
    if (newKey !== key && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, localStorage.getItem(key)!)
      localStorage.removeItem(key)
    }
  }
})()

// v6 起 Blueprint 图标改为按需异步加载（dynamic import）。这里不再在启动期 loadAll，
// 改用默认 split-by-size loader：不在 boot 阶段预取整组 path 数据，而是首个 16px 图标
// 渲染时才拉 16px chunk、首个 20px 图标渲染时才拉 20px chunk。不用大图标的页面可省掉
// ~305KB 的 20px path 数据。首帧若早于对应 chunk 到达，由 blueprint-icons.css 的 woff2
// 字体兜底渲染字形，加载完成后 Icon 组件自动切到内联 SVG——不阻塞首帧。
// 注意：Rolldown 对带运行时变量的 dynamic import(`paths/${name}.js`) 不做按图标 tree-shaking，
// 会把整组同尺寸图标合并进一个 chunk，故无法只下载用到的图标——要达到该效果需手维护静态
// 图标注册表，但本仓库多处图标名是数据驱动（icon={icon}/{type.icon}），静态注册脆弱，
// 取舍后选择当前的「按尺寸懒加载」方案。

const CreatePageLazy = withSuspensable(lazy(() => import('./pages/create').then((m) => ({ default: m.CreatePage }))))
const EditorPageLazy = withSuspensable(lazy(() => import('./pages/editor').then((m) => ({ default: m.EditorPage }))))
const AboutPageLazy = withSuspensable(lazy(() => import('./pages/about').then((m) => ({ default: m.AboutPage }))))
const ProfilePageLazy = withSuspensable(lazy(() => import('./pages/profile').then((m) => ({ default: m.ProfilePage }))))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App>
      <AppLayout>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/create/:id" element={<CreatePageLazy />} />
          <Route path="/create" element={<CreatePageLazy />} />
          <Route path="/about" element={<AboutPageLazy />} />
          <Route path="/profile/:id" element={<ProfilePageLazy />} />
          <Route path="/operation/:id" element={<ViewPage />} />
          <Route path="/editor" element={<EditorPageLazy />} />
          <Route path="/editor/:id" element={<EditorPageLazy />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </App>
  </React.StrictMode>,
)
