import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css'
import '@blueprintjs/select/lib/css/blueprint-select.css'
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

import 'normalize.css'
import React, { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import ReactGA from 'react-ga-neo'
import { Route, Routes } from 'react-router-dom'

import { withSuspensable } from 'components/Suspensable'
import { ViewPage } from 'pages/view'
import { clearOutdatedSwrCache } from 'utils/swr'

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

clearOutdatedSwrCache()

const CreatePageLazy = withSuspensable(
  lazy(() => import('./pages/create').then((m) => ({ default: m.CreatePage }))),
)
const EditorPageLazy = withSuspensable(
  lazy(() => import('./pages/editor').then((m) => ({ default: m.EditorPage }))),
)
const AboutPageLazy = withSuspensable(
  lazy(() => import('./pages/about').then((m) => ({ default: m.AboutPage }))),
)
const ProfilePageLazy = withSuspensable(
  lazy(() =>
    import('./pages/profile').then((m) => ({ default: m.ProfilePage })),
  ),
)
const AdminPageLazy = withSuspensable(
  lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminPage }))),
)

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
          <Route path="/admin" element={<AdminPageLazy />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </App>
  </React.StrictMode>,
)
