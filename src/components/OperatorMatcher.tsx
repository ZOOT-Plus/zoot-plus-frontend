import {
  Button,
  ButtonGroup,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  H4,
  InputGroup,
  Switch,
  Tag,
} from '@blueprintjs/core'

import { RESET } from 'jotai/vanilla/utils'
import { useAtom } from 'jotai'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  DEFAULT_OPERATOR_MATCH_MODES,
  OperatorMatcherFilter,
  OperatorMatchMode,
  createOwnedOperatorMap,
  hasOwnedOperatorDataChanged,
  normalizeYituliuOwnedOperators,
} from '../models/operatorMatcher'
import { operatorMatcherSettingsAtom } from '../store/operatorMatcher'
import { AppToaster } from './Toaster'
import { Confirm } from './Confirm'
import { useTranslation } from '../i18n/i18n'

const YITULIU_OPERATOR_API_URL = 'https://backend.yituliu.cn/open-api/operator/info'
const OPERATOR_DATA_STALE_AFTER_MS = 33 * 24 * 60 * 60 * 1000

function isOperatorDataStale(lastChangedAt: string | undefined) {
  if (!lastChangedAt) {
    return false
  }

  const time = new Date(lastChangedAt).getTime()
  return Number.isFinite(time) && Date.now() - time > OPERATOR_DATA_STALE_AFTER_MS
}

interface OpenApiResult {
  code?: number
  data?: unknown
  message?: string
}

interface OperatorMatcherProps {
  onChange: (matcher: OperatorMatcherFilter | undefined) => void
}

export const OperatorMatcher: FC<OperatorMatcherProps> = ({ onChange }) => {
  const t = useTranslation()
  const [settings, setSettings] = useAtom(operatorMatcherSettingsAtom)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const autoSyncAttempted = useRef(false)

  const closeDialog = () => {
    setDialogOpen(false)
    setToken('')
    setError('')
  }

  const openDialog = () => {
    setToken(settings.token)
    setError('')
    setDialogOpen(true)
  }

  const matcher = useMemo<OperatorMatcherFilter | undefined>(() => {
    if (!settings.enabled || settings.ownedOperators.length === 0) {
      return undefined
    }

    return {
      modes: settings.modes,
      ownedOperators: createOwnedOperatorMap(settings.ownedOperators),
    }
  }, [settings])

  useEffect(() => {
    onChange(matcher)
  }, [matcher, onChange])

  const syncOperators = useCallback(
    async (
      tokenToUse: string,
      options: {
        enableMatching: boolean
        showError: boolean
        showSuccess: boolean
      },
    ) => {
      const normalizedToken = tokenToUse.trim()

      if (!normalizedToken) {
        if (options.showError) {
          setError(t.components.OperatorMatcher.token_required)
        }
        return false
      }

      if (options.showError) {
        setError('')
      }

      setLoading(true)

      try {
        const response = await fetch(YITULIU_OPERATOR_API_URL, {
          headers: {
            Authorization: normalizedToken,
          },
        })
        const payload = (await response.json()) as OpenApiResult

        if (!response.ok || payload.code !== 200) {
          throw new Error(payload.message || t.components.OperatorMatcher.fetch_failed)
        }

        const operators = normalizeYituliuOwnedOperators(payload.data)

        if (operators.length === 0) {
          throw new Error(t.components.OperatorMatcher.no_operators)
        }

        setSettings((current) => {
          const dataChanged = hasOwnedOperatorDataChanged(current.ownedOperators, operators)
          const enableMatching = options.enableMatching ? true : current.enabled
          const modes = current.modes.length > 0 ? current.modes : [...DEFAULT_OPERATOR_MATCH_MODES]
          const shouldSetLastChangedAt = dataChanged || !current.lastChangedAt

          if (
            !dataChanged &&
            !shouldSetLastChangedAt &&
            current.enabled === enableMatching &&
            current.token === normalizedToken &&
            current.modes.length > 0
          ) {
            return current
          }

          return {
            ...current,
            enabled: enableMatching,
            token: normalizedToken,
            ownedOperators: dataChanged ? operators : current.ownedOperators,
            modes,
            ...(shouldSetLastChangedAt ? { lastChangedAt: new Date().toISOString() } : {}),
          }
        })

        if (options.showSuccess) {
          AppToaster.show({
            intent: 'success',
            message: t.components.OperatorMatcher.imported({
              count: operators.length,
            }),
          })
        }

        return true
      } catch (error) {
        if (options.showError) {
          setError(error instanceof Error ? error.message : t.components.OperatorMatcher.fetch_failed)
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    [setSettings, t],
  )

  useEffect(() => {
    if (autoSyncAttempted.current || !settings.token) {
      return
    }

    autoSyncAttempted.current = true
    void syncOperators(settings.token, {
      enableMatching: false,
      showError: false,
      showSuccess: false,
    })
  }, [settings.token, syncOperators])

  const importOperators = async () => {
    autoSyncAttempted.current = true
    const imported = await syncOperators(token, {
      enableMatching: true,
      showError: true,
      showSuccess: true,
    })

    if (imported) {
      closeDialog()
    }
  }

  const toggleMode = (mode: OperatorMatchMode) => {
    if (settings.ownedOperators.length === 0) {
      return
    }

    const modes = settings.modes.includes(mode)
      ? settings.modes.filter((item) => item !== mode)
      : [...settings.modes, mode]

    if (modes.length === 0) {
      return
    }

    setSettings((current) => ({ ...current, modes }))
  }

  const modeOptions: Array<{ mode: OperatorMatchMode; text: string }> = [
    { mode: 'ready', text: t.components.OperatorMatcher.ready },
    { mode: 'borrow', text: t.components.OperatorMatcher.borrow },
    { mode: 'train', text: t.components.OperatorMatcher.train },
    { mode: 'blocked', text: t.components.OperatorMatcher.blocked },
  ]
  const showStaleReminder = isOperatorDataStale(settings.lastChangedAt)

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          minimal
          className="!px-3"
          icon="cog"
          active={settings.enabled && settings.ownedOperators.length > 0}
          intent={settings.enabled && settings.ownedOperators.length > 0 ? 'primary' : 'none'}
          onClick={openDialog}
        >
          {t.components.OperatorMatcher.match_operators}
        </Button>
        {settings.ownedOperators.length > 0 && (
          <ButtonGroup>
            {modeOptions.map(({ mode, text }) => (
              <Button
                key={mode}
                active={settings.modes.includes(mode)}
                disabled={!settings.enabled}
                intent={settings.modes.includes(mode) ? 'primary' : 'none'}
                onClick={() => toggleMode(mode)}
              >
                {text}
              </Button>
            ))}
          </ButtonGroup>
        )}
        {showStaleReminder && (
          <span className="ml-1 text-sm text-amber-700">{t.components.OperatorMatcher.stale_reminder}</span>
        )}
      </div>

      <Dialog isOpen={dialogOpen} onClose={closeDialog} title={t.components.OperatorMatcher.dialog_title}>
        <DialogBody>
          <Callout className="mb-4" icon="info-sign">
            {t.components.OperatorMatcher.token_help.jsx({
              yituliu: (
                <a href="https://ark.yituliu.cn/account/home" target="_blank" rel="noopener noreferrer">
                  {t.links.yituliu_site}
                </a>
              ),
            })}
          </Callout>
          {settings.ownedOperators.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <Tag minimal intent={settings.enabled ? 'primary' : 'none'}>
                {t.components.OperatorMatcher.imported_count({
                  count: settings.ownedOperators.length,
                })}
              </Tag>
            </div>
          )}
          <InputGroup
            fill
            large
            type="text"
            placeholder={t.components.OperatorMatcher.token_placeholder}
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void importOperators()
              }
            }}
          />
          {error && (
            <Callout className="mt-3" intent="danger">
              {error}
            </Callout>
          )}
        </DialogBody>
        <DialogFooter
          actions={
            <>
              {settings.ownedOperators.length > 0 && (
                <Confirm
                  intent="danger"
                  canOutsideClickCancel
                  confirmButtonText={t.components.OperatorMatcher.clear_confirm}
                  onConfirm={() => setSettings(RESET)}
                  trigger={({ handleClick }) => (
                    <Button minimal icon="trash" intent="danger" onClick={handleClick}>
                      {t.components.OperatorMatcher.clear}
                    </Button>
                  )}
                >
                  <H4>{t.components.OperatorMatcher.clear_title}</H4>
                  <p>{t.components.OperatorMatcher.clear_message}</p>
                </Confirm>
              )}
              <Button intent="primary" icon="download" loading={loading} onClick={() => void importOperators()}>
                {settings.ownedOperators.length > 0
                  ? t.components.OperatorMatcher.sync
                  : t.components.OperatorMatcher.import}
              </Button>
            </>
          }
        >
          {settings.ownedOperators.length > 0 && (
            <div>
              <Switch
                className="mb-0"
                checked={settings.enabled}
                label={t.components.OperatorMatcher.enabled}
                onChange={(event) => setSettings((current) => ({ ...current, enabled: event.currentTarget.checked }))}
              />
            </div>
          )}
        </DialogFooter>
      </Dialog>
    </>
  )
}
