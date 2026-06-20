import { Alert, Button, ButtonProps, Callout, H4, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import { first, isEqual } from 'lodash-es'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { useTranslation } from '../../i18n/i18n'
import { formatRelativeTime } from '../../utils/times'

export interface AutosaveOptions<T> {
  key: string
  interval: number
  limit: number
  shouldSave?: (value: T, archive: Archive<T>) => boolean
  onSave?: (value: T, archive: Archive<T>) => void
}

interface Record<T> {
  /** Value */
  v: T
  /** Time */
  t: number
}

type Archive<T> = Record<T>[]

export const isChangedSinceLastSave = (value: unknown, archive: Archive<unknown>) => !isEqual(value, first(archive)?.v)

export function useAutosave<T>(
  getValue: () => T,
  { key, interval, limit, shouldSave = isChangedSinceLastSave, onSave }: AutosaveOptions<T>,
) {
  const [archive, setArchive] = useState<Archive<T>>(() => {
    const initialArchive = localStorage.getItem(key)

    if (initialArchive) {
      try {
        return JSON.parse(initialArchive)
      } catch (e) {
        console.warn(e)
      }
    }

    return []
  })

  const latestArchive = useRef(archive)
  latestArchive.current = archive

  const timer = useRef<ReturnType<typeof setInterval>>()

  const doSave = useCallback(
    (value: T = getValue()) => {
      // perform a deep clone to prevent value's mutation (from outside) from affecting the archive;
      // also, the JSON conversion drops excess properties (e.g. undefined) so that we can correctly
      // deep-compare it with archived values to detect changes
      value = JSON.parse(JSON.stringify(value))

      if (!shouldSave(value, latestArchive.current)) {
        return
      }

      const record: Record<T> = {
        v: value,
        t: Date.now(),
      }
      const newArchive = [record, ...(latestArchive.current || [])].slice(0, limit)

      while (newArchive.length > 0) {
        try {
          localStorage.setItem(key, JSON.stringify(newArchive))
          setArchive(newArchive)
          onSave?.(value, newArchive)
          break
        } catch (e) {
          // drop oldest record in case of capacity excess
          newArchive.pop()

          if (newArchive.length === 0) {
            console.warn('Failed to save：', e)
          }
        }
      }
    },
    [limit, getValue, key, onSave, shouldSave],
  )

  useEffect(() => {
    clearInterval(timer.current)
    timer.current = setInterval(doSave, interval)
    return () => clearInterval(timer.current)
  }, [interval, limit, doSave])

  // immediately save and reset the timer
  const save = useCallback(
    (value?: T) => {
      doSave(value)
      clearInterval(timer.current)
      timer.current = setInterval(doSave, interval)
    },
    [doSave, interval],
  )

  // trigger save on unmount and page unload
  useEffect(() => () => save(), [save])
  window.addEventListener('beforeunload', () => save())

  return {
    archive,
    save,
  }
}

interface AutosaveSheetProps<T> extends ButtonProps {
  archive: Archive<T>
  options: AutosaveOptions<T>
  itemTitle: (record: Record<T>) => ReactNode
  onRestore: (value: T) => void
}

export const AutosaveSheet = <T,>({
  archive,
  itemTitle,
  options: { interval, limit },
  onRestore,
  ...buttonProps
}: AutosaveSheetProps<T>) => {
  const t = useTranslation()
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const restoringRecord = useRef<Record<T>>()

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    return formatRelativeTime(timestamp)
  }

  const handleRestore = () => {
    if (restoringRecord.current) {
      onRestore(restoringRecord.current.v)
      restoringRecord.current = undefined
    }
    setRestoreDialogOpen(false)
  }

  return (
    <>
      <Popover2
        content={
          <>
            <Callout intent="primary">
              {t.components.editor.useAutosave.autosave_info({
                minutes: ~~(interval / 1000 / 60),
                limit,
              })}
            </Callout>
            <Menu className="mt-2 p-0">
              {archive.map((record) => (
                <MenuItem
                  multiline
                  icon="time"
                  text={
                    <>
                      {itemTitle(record)}
                      <div className="text-xs opacity-75">{formatTime(record.t)}</div>
                    </>
                  }
                  key={record.t}
                  onClick={() => {
                    restoringRecord.current = record
                    setRestoreDialogOpen(true)
                  }}
                />
              ))}
            </Menu>
          </>
        }
      >
        <Button
          icon="history"
          text={
            archive.length
              ? t.components.editor.useAutosave.autosaved_at({
                  time: formatTime(first(archive)?.t),
                })
              : t.components.editor.useAutosave.not_saved
          }
          {...buttonProps}
        />
      </Popover2>

      <Alert
        isOpen={restoreDialogOpen}
        cancelButtonText={t.components.editor.useAutosave.cancel}
        confirmButtonText={t.components.editor.useAutosave.confirm}
        icon="rotate-document"
        intent="danger"
        canOutsideClickCancel
        onCancel={() => setRestoreDialogOpen(false)}
        onConfirm={handleRestore}
      >
        <H4>{t.components.editor.useAutosave.restore_content}</H4>
        <p>{t.components.editor.useAutosave.restore_confirmation}</p>
      </Alert>
    </>
  )
}
