import {
  Button,
  ButtonProps,
  Callout,
  Card,
  Classes,
  Drawer,
  DrawerSize,
  FormGroup,
  H4,
  H6,
  Icon,
  IconSize,
  PopoverNext,
  Spinner,
} from '@blueprintjs/core'

import { useAtom, useStore } from 'jotai'
import { debounce, noop } from 'lodash-es'
import { FC, forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ZodError } from 'zod'

import clsx from 'clsx'
import { i18n, useTranslation } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { Confirm } from '../../Confirm'
import { DrawerLayout } from '../../drawer/DrawerLayout'
import { NumericInput2 } from '../../editor/NumericInput2'
import { SourceEditorToolbar } from '../../editor/source/SourceEditorHeader'
import { AppToaster } from '../../Toaster'
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
  const store = useStore()
  const [text] = useState(() => JSON.stringify(toMaaOperation(store.get(editorAtoms.operation)), null, 2))
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'failed'>('idle')
  const [config, setConfig] = useAtom(editorAtoms.config)
  const workspaceRef = useRef<SourceEditorWorkspaceHandle>(null)
  const syncCountdownRef = useRef<CountdownSpinnerHandle>(null)
  const autoSyncEnabled = config.sourceEditorSyncTimeout > 0

  useImperativeHandle(ref, () => ({
    requestClose: () => {
      sync()
      const result = sync.flush()
      if (result === false) {
        return 'unsaved'
      }
      return undefined
    },
  }))

  const sync = useMemo(
    () =>
      debounce((): boolean => {
        if (!workspaceRef.current) {
          return false
        }
        const success = workspaceRef.current.submit((parsed) => {
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
        })
        setSyncState(success ? 'idle' : 'failed')

        return success
      }, config.sourceEditorSyncTimeout),
    [edit, config.sourceEditorSyncTimeout],
  )

  useEffect(() => {
    return () => {
      sync.flush()
    }
  }, [sync])

  const handleChange = () => {
    if (autoSyncEnabled) {
      setSyncState('pending')
      syncCountdownRef.current?.restart()
      sync()
    }
  }

  return (
    <SourceEditorWorkspace
      ref={workspaceRef}
      initialText={text}
      onChange={handleChange}
      toolbar={
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
                syncState === 'pending' ? (
                  <CountdownSpinner countdown={config.sourceEditorSyncTimeout} ref={syncCountdownRef} />
                ) : syncState === 'failed' ? (
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
      }
    />
  )
})
SourceEditor.displayName = 'SourceEditor'

interface SourceEditorWorkspaceHandle {
  submit: (onSubmit: (parsed: ParsedOperation) => void) => boolean
}
interface SourceEditorWorkspaceProps {
  initialText: string
  onChange: (text: string) => void
  toolbar?: React.ReactNode
}

const SourceEditorWorkspace = forwardRef<SourceEditorWorkspaceHandle, SourceEditorWorkspaceProps>(
  ({ initialText, onChange, toolbar }, ref) => {
    const t = useTranslation()
    const [text, setText] = useState(initialText)
    const [errors, setErrors] = useState<string[]>([])
    const [warnings, setWarnings] = useState<string[]>([])

    const parse = useCallback((text: string): ParsedOperation | undefined => {
      setErrors([])
      setWarnings([])

      let json: any
      let parsed: ParsedOperation

      try {
        json = JSON.parse(text)
      } catch (e) {
        setErrors([i18n.components.editor2.SourceEditor.json_syntax_error({ error: formatError(e) })])
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

    useImperativeHandle(ref, () => ({
      submit: (onSubmit) => {
        const parsed = parse(text)
        if (!parsed) return false
        try {
          onSubmit(parsed)
        } catch (e) {
          setErrors(formatErrors(e))
          return false
        }
        return true
      },
    }))

    // this effect should only run once on mount to show validation errors for the initial text,
    // so we intentionally do not put anything in the dependency array
    useEffect(() => {
      parse(text)
      // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleChange = (text: string) => {
      setText(text)
      onChange(text)
    }

    return (
      <DrawerLayout
        title={
          <>
            <Icon icon="manually-entered-data" />
            <span className="ml-2">{t.components.editor.source.SourceEditorHeader.edit_json}</span>
            <div className="flex-1" />
            {toolbar}
            <Button
              className="mr-4"
              icon="curly-braces"
              text={t.components.editor2.SourceEditor.format_json}
              onClick={() => {
                try {
                  const formatted = JSON.stringify(JSON.parse(text), null, 2)
                  handleChange(formatted)
                } catch (e) {
                  AppToaster.show({
                    intent: 'danger',
                    message: t.components.editor2.SourceEditor.json_syntax_error({ error: formatError(e) }),
                  })
                }
              }}
            />
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
          />
        </div>
      </DrawerLayout>
    )
  },
)
SourceEditorWorkspace.displayName = 'SourceEditorWorkspace'

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

const RECOVERY_VALIDATION_DELAY = 500

export const SourceEditorForRecovery: FC<{ input: string; onRecover: (parsed: ParsedOperation) => void }> = ({
  input,
  onRecover,
}) => {
  const t = useTranslation()
  const [validationState, setValidationState] = useState<'idle' | 'pending' | 'failed'>('idle')
  const workspaceRef = useRef<SourceEditorWorkspaceHandle>(null)
  const validationCountdownRef = useRef<CountdownSpinnerHandle>(null)

  const validate = useMemo(
    () =>
      debounce(() => {
        if (!workspaceRef.current) {
          return
        }
        const success = workspaceRef.current.submit(noop)
        setValidationState(success ? 'idle' : 'failed')
      }, RECOVERY_VALIDATION_DELAY),
    [],
  )

  useEffect(() => {
    return () => {
      validate.flush()
    }
  }, [validate])

  const handleChange = () => {
    setValidationState('pending')
    validationCountdownRef.current?.restart()
    validate()
  }

  const submit = () => {
    if (validationState === 'pending' || !workspaceRef.current) {
      return
    }
    const success = workspaceRef.current?.submit((parsed) => {
      onRecover(parsed)
    })
    if (!success) {
      AppToaster.show({
        intent: 'danger',
        message: t.components.editor2.SourceEditor.recovery_submit_failed,
      })
    }
  }

  return (
    <div className="max-w-screen-xl h-screen mx-auto mt-4 flex flex-col">
      <H4>{t.components.editor2.SourceEditor.recovery_note}</H4>
      <Card className="!p-0 grow overflow-hidden">
        <SourceEditorWorkspace
          ref={workspaceRef}
          initialText={input}
          onChange={handleChange}
          toolbar={
            <Button
              className="mr-4"
              icon={
                validationState === 'pending' ? (
                  <CountdownSpinner countdown={RECOVERY_VALIDATION_DELAY} ref={validationCountdownRef} />
                ) : validationState === 'failed' ? (
                  <Icon intent="danger" icon="error" />
                ) : (
                  <Icon intent="success" icon="tick" />
                )
              }
              intent={validationState === 'idle' ? 'success' : undefined}
              text={t.components.editor2.SourceEditor.submit}
              onClick={submit}
            />
          }
        />
      </Card>
    </div>
  )
}

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
