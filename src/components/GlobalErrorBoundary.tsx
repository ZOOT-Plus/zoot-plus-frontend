import { Button, NonIdealState } from '@blueprintjs/core'
import { ErrorBoundary } from '@sentry/react'

import { ComponentType } from 'react'
import { FCC } from 'types'

import { i18n } from '../i18n/i18n'

export const GlobalErrorBoundary: FCC = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <NonIdealState
          icon="issue"
          title={i18n.essentials.error_occurred}
          description={i18n.essentials.render_error}
          action={
            <Button intent="primary" icon="refresh" onClick={() => window.location.reload()}>
              {i18n.essentials.refresh_page}
            </Button>
          }
        />
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function withGlobalErrorBoundary<P extends {}>(Component: ComponentType<P>): ComponentType<P> {
  const Wrapped: ComponentType<P> = (props) => {
    return (
      <GlobalErrorBoundary>
        <Component {...props} />
      </GlobalErrorBoundary>
    )
  }

  // Format for display in DevTools
  const name = Component.displayName || Component.name || 'Unknown'
  Wrapped.displayName = `withGlobalErrorBoundary(${name})`

  return Wrapped
}
