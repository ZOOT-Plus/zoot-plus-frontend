import { Button, NonIdealState, Spinner } from '@blueprintjs/core'
import { ErrorBoundary } from '@sentry/react'

import { ComponentType, Suspense, useEffect, useRef } from 'react'
import { FCC } from 'types'

import { useTranslation } from '../i18n/i18n'

interface SuspensableProps {
  // deps that will cause the Suspense's error to reset
  retryDeps?: readonly any[]

  pendingTitle?: string | (() => string)

  fetcher?: () => void
  errorFallback?: (params: { error: Error }) => JSX.Element | undefined
}

export const Suspensable: FCC<SuspensableProps> = ({
  children,
  retryDeps = [],
  pendingTitle,
  fetcher,
  errorFallback,
}) => {
  const resetError = useRef<() => void>()
  const t = useTranslation()

  if (typeof pendingTitle === 'function') {
    pendingTitle = pendingTitle()
  }
  pendingTitle ??= t.components.Suspensable.loading

  useEffect(() => {
    resetError.current?.()
    resetError.current = undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, retryDeps)

  return (
    <ErrorBoundary
      fallback={({ resetError: _resetError, error }) => {
        const fallback = errorFallback?.({ error })
        if (fallback !== undefined) {
          return fallback
        }

        resetError.current = _resetError

        return (
          <NonIdealState
            icon="issue"
            title={t.components.Suspensable.loadFailed}
            description={fetcher ? t.components.Suspensable.dataLoadFailedRetry : error.message}
            className="py-8"
            action={
              fetcher && (
                <Button
                  intent="primary"
                  icon="refresh"
                  onClick={() => {
                    _resetError()
                    resetError.current = undefined
                    fetcher()
                  }}
                >
                  {t.components.Suspensable.retry}
                </Button>
              )
            }
          />
        )
      }}
    >
      <Suspense fallback={<NonIdealState icon={<Spinner />} title={pendingTitle} className="py-8" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export function withSuspensable<P extends {}>(
  Component: ComponentType<P>,
  {
    retryOnChange,
    ...suspensableProps
  }: Omit<SuspensableProps, 'retryDeps'> & {
    // keys of a subset of props that will be passed as `retryDeps` to Suspensable
    retryOnChange?: readonly (keyof P)[]
  } = {},
): ComponentType<P> {
  const Wrapped: ComponentType<P> = (props) => {
    return (
      <Suspensable {...suspensableProps} retryDeps={retryOnChange?.map((key) => props[key])}>
        <Component {...props} />
      </Suspensable>
    )
  }

  // Format for display in DevTools
  const name = Component.displayName || Component.name || 'Unknown'
  Wrapped.displayName = `withSuspensable(${name})`

  return Wrapped
}
