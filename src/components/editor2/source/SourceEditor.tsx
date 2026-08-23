import {
  Button,
  ButtonProps,
  Callout,
  Classes,
  Drawer,
  DrawerSize,
  FormGroup,
  H6,
  Icon,
  IconSize,
  PopoverNext,
  Spinner,
} from '@blueprintjs/core'

import { atom, useAtom, useSetAtom } from 'jotai'
import { debounce } from 'lodash-es'
import { FC, forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ZodError } from 'zod'

import clsx from 'clsx'
import { i18n, useTranslation } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { Confirm } from '../../Confirm'
import { DrawerLayout } from '../../drawer/DrawerLayout'
import { NumericInput2 } from '../../editor/NumericInput2'
import { SourceEditorToolbar } from '../../editor/source/SourceEditorHeader'
import { editorAtoms, useEdit } from '../editor-state'
import { toEditorOperation, toMaaOperation } from '../reconciliation'
import { operationForParsing, operationForValidation, ParsedOperation } from '../validation/schema'
import { IssuesDisplay } from '../validation/Validator'

interface SourceEditorHandle {
  requestClose: () => 'unsaved' | void
}

const SourceEditor = forwardRef<SourceEditorHandle>((_, ref) => {
  const t = useTranslation()
  const edit = useEdit()
  const getOperation = useSetAtom(useState(() => atom(null, (get) => get(editorAtoms.operation)))[0])
  const [text, setText] = useState(() => JSON.stringify(toMaaOperation(getOperation()), null, 2))
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [config, setConfig] = useAtom(editorAtoms.config)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const syncCountdownRef = useRef<CountdownSpinnerHandle>(null)
  const autoSyncEnabled = config.sourceEditorSyncTimeout > 0

  useImperativeHandle(ref, () => ({
    requestClose: () => {
      if (hasUnsavedChanges) {
        sync(text)
        const result = sync.flush()
        if (result === false) {
          return 'unsaved'
        }
      }
      return undefined
    },
  }))

  const parse = useCallback((text: string): ParsedOperation | undefined => {
    setErrors([])
    setWarnings([])

    let json: any
    let parsed: ParsedOperation

    try {
      json = JSON.parse(text)
    } catch (e) {
      setErrors([i18n.components.editor2.SourceEditor.json_syntax_error])
      return undefined
    }
    try {
      parsed = operationForParsing.parse(json)
    } catch (e) {
      setErrors(formatErrors(e))
      return undefined
    }
    try {
      operationForValidation.parse(json)
    } catch (e) {
      setWarnings(formatErrors(e))
    }

    return parsed
  }, [])

  // this effect should only run once on mount to show validation errors for the initial text,
  // so we intentionally do not put anything in the dependency array
  useEffect(() => {
    parse(text)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sync = useMemo(
    () =>
      debounce((text: string): boolean => {
        setSyncing(false)
        const parsed = parse(text)
        if (!parsed) {
          return false
        }
        try {
          const newOperation = toEditorOperation(parsed)
          edit((get, set, skip) => {
            const operation = get(editorAtoms.operation)
            if (JSON.stringify(operation) === JSON.stringify(newOperation)) {
              return skip
            }
            set(editorAtoms.operation, newOperation)
            return {
              action: 'edit-json',
              desc: i18n.actions.editor2.set_json,
              squashBy: '',
            }
          })

          setHasUnsavedChanges(false)
        } catch (e) {
          setErrors(formatErrors(e))
        }

        return true
      }, config.sourceEditorSyncTimeout),
    [edit, parse, config.sourceEditorSyncTimeout],
  )

  useEffect(() => {
    return () => {
      sync.flush()
    }
  }, [sync])

  const handleChange = (text: string) => {
    setText(text)
    setHasUnsavedChanges(true)

    if (autoSyncEnabled) {
      setSyncing(true)
      syncCountdownRef.current?.restart()
      sync(text)
    }
  }

  return (
    <DrawerLayout
      title={
        <>
          <Icon icon="manually-entered-data" />
          <span className="ml-2">{t.components.editor.source.SourceEditorHeader.edit_json}</span>
          <div className="flex-1" />
          <PopoverNext
            animation="minimal"
            arrow={false}
            placement="bottom-start"
            content={
              <FormGroup
                className="max-w-96 my-2"
                label={t.components.editor2.SourceEditor.auto_sync_timeout}
                helperText={t.components.editor2.SourceEditor.auto_sync_note}
              >
                <NumericInput2
                  intOnly
                  value={config.sourceEditorSyncTimeout}
                  min={0}
                  majorStepSize={1000}
                  stepSize={100}
                  wheelStepSize={100}
                  onValueChange={(v) => setConfig((c) => ({ sourceEditorSyncTimeout: v }))}
                />
              </FormGroup>
            }
          >
            <Button
              className="mr-4"
              icon={
                autoSyncEnabled ? (
                  syncing ? (
                    <CountdownSpinner countdown={config.sourceEditorSyncTimeout} ref={syncCountdownRef} />
                  ) : hasUnsavedChanges ? (
                    <Icon intent="warning" icon="warning-sign" />
                  ) : (
                    <Icon intent="success" icon="tick" />
                  )
                ) : (
                  <Icon icon="disable" />
                )
              }
              text={t.components.editor2.SourceEditor.auto_sync}
              endIcon="caret-down"
            />
          </PopoverNext>
          <SourceEditorToolbar text={text} onChange={handleChange} />
        </>
      }
    >
      <div className="px-8 py-2 flex-grow flex flex-col gap-2 bg-zinc-50 dark:bg-slate-900 dark:text-white">
        <Callout
          title={
            errors.length || warnings.length
              ? t.components.editor2.SourceEditor.validation_failed
              : t.components.editor2.SourceEditor.validation_passed
          }
          intent={errors.length ? 'danger' : warnings.length ? 'warning' : 'success'}
        >
          {errors.length > 0 || warnings.length > 0 ? (
            <details open>
              <summary className="cursor-pointer">
                {t.components.editor2.SourceEditor.error_count({
                  count: errors.length + warnings.length,
                })}
              </summary>
              <IssuesDisplay minimal className="!p-0" errors={errors} warnings={warnings} />
            </details>
          ) : null}
        </Callout>
        <textarea
          className="p-1 flex-grow bg-white border text-xm font-mono resize-none focus:outline focus:outline-2 focus:outline-purple-300 dark:bg-slate-900 dark:text-white"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => sync.flush()}
        />
      </div>
    </DrawerLayout>
  )
})
SourceEditor.displayName = 'SourceEditor'

interface CountdownSpinnerHandle {
  restart: () => void
}

const CountdownSpinner = memo(
  forwardRef<CountdownSpinnerHandle, { countdown: number }>(({ countdown }, ref) => {
    const [phase, setPhase] = useState<'idle' | 'active'>('idle')
    const [value, setValue] = useState(0)

    useImperativeHandle(ref, () => ({
      restart: () => {
        setPhase('idle')
        setValue(0)
      },
    }))

    useEffect(() => {
      if (value !== 1) {
        setValue(1)
        if (phase === 'idle') {
          setPhase('active')
        }
      }
    }, [phase, value])

    return (
      <Spinner
        size={IconSize.STANDARD}
        className={clsx(
          Classes.ICON,
          phase === 'idle'
            ? '[&_.bp6-spinner-head]:transition-none'
            : '[&_.bp6-spinner-head]:[transition:stroke-dashoffset_var(--countdown)_linear]',
        )}
        style={{
          ['--countdown' as string]: `${countdown}ms`,
        }}
        value={value}
      />
    )
  }),
)

interface SourceEditorButtonProps extends ButtonProps {
  className?: string
}

export const SourceEditorButton: FC<SourceEditorButtonProps> = memo(({ className, ...buttonProps }) => {
  const t = useTranslation()
  const [isOpen, setIsOpen] = useAtom(editorAtoms.sourceEditorIsOpen)
  const sourceEditorRef = useRef<SourceEditorHandle>(null)

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
            onClose={async () => {
              const result = sourceEditorRef.current?.requestClose()
              if (result === 'unsaved') {
                handleClick()
              } else {
                setIsOpen(false)
              }
            }}
          >
            {isOpen && <SourceEditor ref={sourceEditorRef} />}
          </Drawer>
        )}
      >
        <H6>{t.components.editor2.SourceEditor.unsaved_changes}</H6>
        <p>{t.components.editor2.SourceEditor.unsaved_warning}</p>
      </Confirm>
    </>
  )
})
SourceEditorButton.displayName = 'SourceEditorButton'

function formatErrors(e: unknown): string[] {
  if (e instanceof ZodError) {
    return e.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  } else {
    return [
      i18n.components.editor2.SourceEditor.unknown_error({
        error: formatError(e),
      }),
    ]
  }
}
