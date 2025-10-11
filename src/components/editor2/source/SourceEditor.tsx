import {
  Button,
  ButtonGroup,
  ButtonProps,
  Callout,
  Drawer,
  DrawerSize,
  H6,
  IconSize,
  Spinner,
} from '@blueprintjs/core'

import { useAtom } from 'jotai'
import { debounce } from 'lodash-es'
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ZodError } from 'zod'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { Confirm } from '../../Confirm'
import { withSuspensable } from '../../Suspensable'
import { DrawerLayout } from '../../drawer/DrawerLayout'
import { SourceEditorHeader } from './SourceEditorHeader'
import { editorAtoms, useEdit } from '../editor-state'
import { toEditorOperation, toMaaOperation } from '../reconciliation'
import { toSimingOperationRemote } from '../siming-export'
import { ZodIssue, parseOperationLoose } from '../validation/schema'
import { useLevels } from '../../../apis/level'
import { findLevelByStageName } from '../../../models/level'

interface SourceEditorProps {
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void
}

const SourceEditor = withSuspensable(
  ({ onUnsavedChanges }: SourceEditorProps) => {
    const t = useTranslation()
    const onUnsavedChangesRef = useRef(onUnsavedChanges)
    onUnsavedChangesRef.current = onUnsavedChanges
    const edit = useEdit()
    const [operation, setOperation] = useAtom(editorAtoms.operation)
    const [text, setText] = useAtom(editorAtoms.sourceEditorText)
    const [viewMode, setViewMode] = useState<'maa' | 'siming'>('maa')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [pending, setPending] = useState(false)
    const [errors, setErrors] = useState<(ZodIssue | string)[]>([])

    const [simingText, setSimingText] = useState<string>('')
    const [simingPending, setSimingPending] = useState(false)
    const [simingError, setSimingError] = useState<string | null>(null)
    const { data: levels } = useLevels({ suspense: false })

    // fetch Siming JSON from remote when viewing siming or operation changes
    const refreshSiming = useCallback(async () => {
      try {
        setSimingPending(true)
        setSimingError(null)
        const base = toMaaOperation(operation)
        const selectedLevel = levels
          ? findLevelByStageName(
              levels,
              (base as any).stageName ?? (base as any).stage_name ?? '',
            )
          : undefined
        const result = await toSimingOperationRemote(base, operation, { level: selectedLevel })
        setSimingText(JSON.stringify(result, null, 2))
      } catch (e) {
        setSimingError(formatError(e))
        setSimingText('')
      } finally {
        setSimingPending(false)
      }
    }, [operation, levels])

    useEffect(() => {
      if (viewMode === 'siming') {
        // fire and forget; errors will be shown below
        refreshSiming()
      }
    }, [viewMode, refreshSiming])

    const update = useMemo(
      () =>
        debounce((text: string) => {
          setPending(false)
          try {
            const json = parseOperationLoose(JSON.parse(text))
            edit((get, set, skip) => {
              const newOperation = toEditorOperation(json)
              const operation = get(editorAtoms.operation)
              if (JSON.stringify(operation) === JSON.stringify(newOperation)) {
                return skip
              }
              setOperation(newOperation)
              return {
                action: 'edit-json',
                desc: i18n.actions.editor2.set_json,
                squashBy: '',
              }
            })

            setErrors([])
            setHasUnsavedChanges(false)
            onUnsavedChangesRef.current?.(false)
          } catch (e) {
            if (e instanceof SyntaxError) {
              setErrors([
                i18n.components.editor2.SourceEditor.json_syntax_error,
              ])
            } else if (e instanceof ZodError) {
              setErrors(e.issues)
            } else {
              setErrors([
                i18n.components.editor2.SourceEditor.unknown_error({
                  error: formatError(e),
                }),
              ])
            }
          }
        }, 1000),
      [edit, setOperation],
    )

    const applyText = useCallback(
      (nextText: string, { force = false, flush = false } = {}) => {
        if (!force && viewMode !== 'maa') {
          return
        }
        setPending(true)
        setText(nextText)
        update(nextText)
        setHasUnsavedChanges(true)
        onUnsavedChangesRef.current?.(true)
        if (flush) {
          update.flush()
        }
      },
      [update, viewMode],
    )

    const handleChange = useCallback(
      (text: string) => {
        applyText(text)
      },
      [applyText],
    )

    const handleImport = useCallback(
      (text: string) => {
        applyText(text, { force: true, flush: true })
      },
      [applyText],
    )

    const displayedText = viewMode === 'maa' ? text : simingText

    return (
      <DrawerLayout
        title={
          <SourceEditorHeader text={displayedText} onChange={handleChange} onImport={handleImport} />
        }
      >
        <div className="px-8 py-4 flex-grow flex flex-col gap-2 bg-zinc-50 dark:bg-slate-900 dark:text-white">
          <Callout
            title={t.components.editor2.SourceEditor.auto_sync_note}
            intent={hasUnsavedChanges ? 'primary' : 'success'}
            icon={
              pending ? (
                <Spinner size={IconSize.STANDARD} className="bp4-icon" />
              ) : hasUnsavedChanges ? (
                'warning-sign'
              ) : (
                'tick'
              )
            }
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {t.components.editor2.SourceEditor.view_json_mode}
            </span>
            <ButtonGroup minimal>
              <Button
                small
                active={viewMode === 'siming'}
                onClick={() => {
                  if (viewMode !== 'siming') {
                    update.flush()
                    setViewMode('siming')
                  }
                }}
              >
                {t.components.editor2.SourceEditor.view_json_mode_siming}
              </Button>
            </ButtonGroup>
          </div>
          <Callout
            title={
              errors.length
                ? t.components.editor2.SourceEditor.has_errors
                : t.components.editor2.SourceEditor.validation_passed
            }
            intent={errors.length ? 'danger' : 'success'}
          >
            {errors.length > 0 ? (
              <details open>
                <summary className="cursor-pointer">
                  {t.components.editor2.SourceEditor.error_count({
                    count: errors.length,
                  })}
                </summary>
                <ul className="">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {typeof error === 'string' ? (
                        error
                      ) : (
                        <>
                          {' '}
                          <span className="font-bold">
                            {error.path.join('.')}:{' '}
                          </span>
                          {error.message}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Callout>
          <textarea
            className="p-1 flex-grow bg-white border text-xm font-mono resize-none focus:outline focus:outline-2 focus:outline-purple-300 dark:bg-slate-900 dark:text-white"
            value={displayedText}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => viewMode === 'maa' && update.flush()}
            readOnly={viewMode !== 'maa'}
          />
          {viewMode === 'siming' ? (
            <>
              {simingPending ? (
                <Callout intent="primary" icon="time">
                  {t.common.loading}
                </Callout>
              ) : simingError ? (
                <Callout intent="danger" icon="error">
                  {simingError}
                </Callout>
              ) : (
                <Callout intent="primary" icon="info-sign">
                  {t.components.editor2.SourceEditor.siming_view_readonly}
                </Callout>
              )}
            </>
          ) : null}
        </div>
      </DrawerLayout>
    )
  },
)
SourceEditor.displayName = 'SourceEditor'

interface SourceEditorButtonProps extends ButtonProps {
  className?: string
}

export const SourceEditorButton: FC<SourceEditorButtonProps> = memo(
  ({ className, ...buttonProps }) => {
    const t = useTranslation()
    const [isOpen, setIsOpen] = useAtom(editorAtoms.sourceEditorIsOpen)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    return (
      <>
        <Button
          className={className}
          icon="manually-entered-data"
          text={t.components.editor2.SourceEditor.edit_json}
          {...buttonProps}
          onClick={() => setIsOpen(true)}
        />
        <Confirm
          intent="danger"
          confirmButtonText={t.common.close}
          onConfirm={() => setIsOpen(false)}
          trigger={({ handleClick }) => (
            <Drawer
              className="max-w-[800px]"
              size={DrawerSize.LARGE}
              isOpen={isOpen}
              onClose={() => {
                if (hasUnsavedChanges) {
                  handleClick()
                } else {
                  setIsOpen(false)
                }
              }}
            >
              {isOpen && (
                <SourceEditor onUnsavedChanges={setHasUnsavedChanges} />
              )}
            </Drawer>
          )}
        >
          <H6>{t.components.editor2.SourceEditor.unsaved_changes}</H6>
          <p>{t.components.editor2.SourceEditor.unsaved_warning}</p>
        </Confirm>
      </>
    )
  },
)
SourceEditorButton.displayName = 'SourceEditorButton'
