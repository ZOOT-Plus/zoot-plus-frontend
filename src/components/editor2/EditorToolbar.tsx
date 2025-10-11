import {
  Button,
  ButtonProps,
  Callout,
  H2,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  Tag,
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { FC, useCallback, useRef, useState } from 'react'

import { i18n, useTranslation } from '../../i18n/i18n'
import { formatError } from '../../utils/error'
import { formatRelativeTime } from '../../utils/times'
import { useCurrentSize } from '../../utils/useCurrenSize'
import { RelativeTime } from '../RelativeTime'
import { AppToaster } from '../Toaster'
import { Settings } from './Settings'
import { editorAtoms, historyAtom, useEdit } from './editor-state'
import { useHistoryControls, useHistoryValue } from './history'
import { hydrateOperation, toEditorOperation, toMaaOperation } from './reconciliation'
import { SourceEditorButton } from './source/SourceEditor'
import { FileImporter } from './source/FileImporter'
import { XlsxImporter } from './source/XlsxImporter'
import { ShortCodeImporter } from './source/ShortCodeImporter'
import { BiyongImporter } from './source/BiyongImporter'
import {
  AUTO_SAVE_INTERVAL,
  AUTO_SAVE_LIMIT,
  editorArchiveAtom,
  editorSaveAtom,
} from './useAutoSave'
import { getLabeledPath, parseOperationLoose } from './validation/schema'

interface EditorToolbarProps extends SubmitButtonProps {
  subtitle?: string
}

export const EditorToolbar: FC<EditorToolbarProps> = ({
  subtitle,
  submitAction,
  onSubmit,
}) => {
  const t = useTranslation()
  const { isLG } = useCurrentSize()
  const buttonProps = {
    minimal: true,
    className: isLG ? undefined : 'min-w-10 h-10',
  } satisfies ButtonProps

  return (
    <div className="px-4 md:px-8 flex items-center flex-wrap [&_.bp4-button-text]:leading-none bg-white dark:bg-[#383e47]">
      <Icon icon="properties" />
      <div className="ml-2 flex items-baseline">
        <H2 className="!text-base mb-0">
          {t.components.editor2.EditorToolbar.title}
        </H2>
        <Tag minimal className="ml-1" intent="warning">
          Beta
        </Tag>
        {subtitle && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
        )}
      </div>
      <div className="grow py-1 flex flex-wrap items-center justify-end">
        <span className="grow" />
        <Settings {...buttonProps} />
        <AutoSaveButton {...buttonProps} />
        <HistoryButtons {...buttonProps} />
        <ErrorVisibleButton {...buttonProps} />
        <ErrorButton {...buttonProps} />
        <ImportOperationButton {...buttonProps} />
        <SourceEditorButton {...buttonProps} />
        <span className="grow max-w-4" />
        <SubmitButton submitAction={submitAction} onSubmit={onSubmit} />
      </div>
    </div>
  )
}

interface SubmitButtonProps extends ButtonProps {
  submitAction: string
  onSubmit: () => Promise<void | false> | false | void
}


const ImportOperationButton = (buttonProps: ButtonProps) => {
  const t = useTranslation()
  const edit = useEdit()
  const setOperation = useSetAtom(editorAtoms.operation)
  const setSourceEditorText = useSetAtom(editorAtoms.sourceEditorText)
  const [isOpen, setIsOpen] = useState(false)

  const handleImport = useCallback(
    (content: string) => {
      setIsOpen(false)
      try {
        const parsed = JSON.parse(content)
        const operationLoose = parseOperationLoose(parsed)
        const newOperation = toEditorOperation(operationLoose)
        const formatted = JSON.stringify(toMaaOperation(newOperation), null, 2)

        edit((get, set, skip) => {
          const current = get(editorAtoms.operation)
          if (JSON.stringify(current) === JSON.stringify(newOperation)) {
            return skip
          }
          setOperation(newOperation)
          return {
            action: 'import-json',
            desc: i18n.actions.editor2.set_json,
            squashBy: '',
          }
        })

        setSourceEditorText(formatted)
      } catch (error) {
        console.warn('Failed to import operation JSON', error)
        const message =
          error instanceof SyntaxError
            ? t.components.editor2.SourceEditor.json_syntax_error
            : i18n.components.editor2.SourceEditor.unknown_error({
                error: formatError(error),
              })
        AppToaster.show({
          message,
          intent: 'danger',
        })
      }
    },
    [edit, i18n, setOperation, setSourceEditorText, t],
  )

  return (
    <Popover2
      minimal
      position="bottom-left"
      popoverClassName="z-50"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      content={
        <Menu>
          <FileImporter onImport={handleImport} />
          <XlsxImporter onImport={handleImport} />
          <ShortCodeImporter onImport={handleImport} />
          <BiyongImporter onImport={handleImport} />
        </Menu>
      }
    >
      <Button
        icon="import"
        rightIcon="caret-down"
        text={t.components.editor.source.SourceEditorHeader.import}
        {...buttonProps}
        onClick={() => setIsOpen((prev) => !prev)}
      />
    </Popover2>
  )
}
const SubmitButton = ({
  submitAction,
  onSubmit,
  className,
  ...buttonProps
}: SubmitButtonProps) => {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const statusResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSubmit = async () => {
    if (submitting || status !== 'idle') return
    setSubmitting(true)
    try {
      const result = await onSubmit()
      if (result !== false) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch (e) {
      setStatus('error')
      console.error(e)
    } finally {
      statusResetTimer.current = setTimeout(() => {
        statusResetTimer.current = null
        setStatus('idle')
      }, 2000)
      setSubmitting(false)
    }
  }
  return (
    <Button
      large
      {...buttonProps}
      intent={
        status === 'success'
          ? 'success'
          : status === 'error'
            ? 'danger'
            : 'primary'
      }
      className={clsx('w-40', className)}
      icon={status === 'success' ? 'tick' : 'upload'}
      loading={submitting}
      text={submitAction}
      onClick={handleSubmit}
    />
  )
}

const AutoSaveButton = (buttonProps: ButtonProps) => {
  const t = useTranslation()
  const edit = useEdit()
  const archive = useAtomValue(editorArchiveAtom)
  const save = useSetAtom(editorSaveAtom)
  const setEditorState = useSetAtom(editorAtoms.editor)
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Popover2
      content={
        isOpen ? (
          <>
            <Callout
              intent="primary"
              icon={null}
              className="p-0 pl-2 flex items-center gap-2"
            >
              {t.components.editor2.EditorToolbar.auto_save_interval({
                count: AUTO_SAVE_INTERVAL / 1000 / 60,
                records: archive.length,
                limit: AUTO_SAVE_LIMIT,
              })}
              <Button
                icon="floppy-disk"
                intent="primary"
                onClick={() => {
                  try {
                    save()
                  } catch (e) {
                    AppToaster.show({
                      message:
                        i18n.components.editor2.EditorToolbar.cannot_save({
                          error: formatError(e),
                        }),
                      intent: 'danger',
                    })
                  }
                }}
              >
                {t.components.editor2.EditorToolbar.save_now}
              </Button>
            </Callout>
            <Menu className="mt-2 p-0">
              {archive.map((record) => (
                <MenuItem
                  multiline
                  icon="time"
                  text={
                    record.v.operation.doc.title ||
                    t.components.editor2.EditorToolbar.untitled
                  }
                  label={formatRelativeTime(record.t)}
                  key={record.t}
                  onClick={() => {
                    edit(() => {
                      setEditorState({
                        ...record.v,
                        operation: hydrateOperation(record.v.operation),
                      })
                      return {
                        action: 'restore',
                        desc: i18n.actions.editor2.restore_from_autosave,
                      }
                    })
                  }}
                />
              ))}
            </Menu>
          </>
        ) : (
          <span />
        )
      }
      placement="bottom"
      onOpening={() => setIsOpen(true)}
      onClosed={() => setIsOpen(false)}
    >
      <Button
        {...buttonProps}
        icon="projects"
        title={t.components.editor2.EditorToolbar.auto_save}
      />
    </Popover2>
  )
}

const HistoryButtons = (buttonProps: ButtonProps) => {
  const t = useTranslation()
  const { history, canRedo, canUndo } = useHistoryValue(historyAtom)
  const { undo, redo, checkout } = useHistoryControls(historyAtom)
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button
        {...buttonProps}
        icon="undo"
        title={t.components.editor2.EditorToolbar.undo}
        disabled={!canUndo}
        onClick={undo}
      />
      <Button
        {...buttonProps}
        icon="redo"
        title={t.components.editor2.EditorToolbar.redo}
        disabled={!canRedo}
        onClick={redo}
      />
      <Popover2
        content={
          isOpen ? (
            <Menu>
              <MenuDivider
                className="pb-2 border-b"
                title={t.components.editor2.EditorToolbar.undo_history_header({
                  limit: history.limit,
                })}
              />
              {[...history.stack].reverse().map((record, reversedIndex) => {
                const index = history.stack.length - 1 - reversedIndex
                return (
                  <MenuItem
                    key={index}
                    className={clsx(
                      index === 0 && 'italic',
                      index === history.index ? 'font-bold' : undefined,
                    )}
                    text={
                      index +
                      1 +
                      '. ' +
                      (record.action === 'init'
                        ? t.actions.editor2.init
                        : record.desc)
                    }
                    labelElement={
                      <RelativeTime
                        className="ml-4 text-xs"
                        moment={record.time}
                      />
                    }
                    onClick={() => checkout(index)}
                  />
                )
              })}
            </Menu>
          ) : (
            <span />
          )
        }
        placement="bottom"
        onOpening={() => setIsOpen(true)}
        onClosed={() => setIsOpen(false)}
      >
        <Button
          {...buttonProps}
          icon="history"
          className={clsx('tabular-nums', buttonProps.className)}
          title={t.components.editor2.EditorToolbar.undo_history}
          text={history.index + 1 + '/' + history.stack.length}
        />
      </Popover2>
    </>
  )
}

const ErrorButton = (buttonProps: ButtonProps) => {
  const t = useTranslation()
  const globalErrors = useAtomValue(editorAtoms.globalErrors)
  const entityErrors = useAtomValue(editorAtoms.entityErrors)
  const [isOpen, setIsOpen] = useState(false)
  const allErrors = globalErrors.concat(Object.values(entityErrors).flat())
  return (
    <Popover2
      content={
        isOpen ? (
          <>
            <MenuDivider
              className="pb-2 border-b"
              title={t.components.editor2.EditorToolbar.errors_header}
            />
            <ul className="m-2 text-red-500">
              {allErrors.map(({ path, message }) => (
                <li key={path.join()}>
                  <span className="font-bold">{getLabeledPath(path)}: </span>
                  {message}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span />
        )
      }
      placement="bottom"
      isOpen={isOpen}
      onInteraction={(isOpen) => setIsOpen(allErrors.length > 0 && isOpen)}
    >
      <Button
        {...buttonProps}
        className={clsx('tabular-nums', buttonProps.className)}
        icon={allErrors.length > 0 ? 'cross-circle' : 'tick-circle'}
        intent={allErrors.length > 0 ? 'danger' : 'success'}
        title={
          allErrors.length > 0
            ? t.components.editor2.EditorToolbar.errors_header
            : t.components.editor2.EditorToolbar.no_errors
        }
        text={
          allErrors.length || <Icon className="!-ml-px" icon="small-tick" />
        }
      />
    </Popover2>
  )
}

const ErrorVisibleButton = (buttonProps: ButtonProps) => {
  const t = useTranslation()
  const [visible, setVisible] = useAtom(editorAtoms.errorsVisible)
  return (
    <Button
      {...buttonProps}
      icon="eye-open"
      active={visible}
      onClick={() => setVisible(!visible)}
      title={t.components.editor2.EditorToolbar.show_errors}
    />
  )
}
