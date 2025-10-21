import {
  AnchorButton,
  Callout,
  FileInput,
  FormGroup,
  H4,
  Icon,
  Spinner,
  SpinnerSize,
  Tag,
} from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import { useLevels } from 'apis/level'
import { createOperation } from 'apis/operation'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import { ComponentType, useState } from 'react'
import { useList } from 'react-use'

import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { DrawerLayout } from 'components/drawer/DrawerLayout'

import { useTranslation } from '../../i18n/i18n'
import { findLevelByStageName } from '../../models/level'
import { formatError } from '../../utils/error'
import { toEditorOperation } from '../editor2/reconciliation'
import {
  SimingOperation,
  toSimingOperationRemote,
} from '../editor2/siming-export'
import { parseOperationLoose } from '../editor2/validation/schema'
import { parseOperationFile, patchOperation, validateOperation } from './utils'

interface FileEntry {
  file: File
  error?: string
  operation?: SimingOperation
  uploaded?: boolean
}

export const OperationUploader: ComponentType = withSuspensable(() => {
  const t = useTranslation()
  const [files, { set: setFiles, update: updateFileWhere }] =
    useList<FileEntry>([])

  const [globalErrors, setGlobalErrors] = useState(null as string[] | null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [operationStatus] = useState<CopilotInfoStatusEnum>(
    CopilotInfoStatusEnum.Private,
  )

  // reasons are in the order of keys
  const nonUploadableReason = Object.entries({
    [t.components.uploader.OperationUploader.wait_upload]: isUploading,
    [t.components.uploader.OperationUploader.wait_parsing]: isProcessing,
    [t.components.uploader.OperationUploader.select_files]: !files.length,
    [t.components.uploader.OperationUploader.contains_uploaded]: files.some(
      (file) => file.uploaded,
    ),
    [t.components.uploader.OperationUploader.file_errors]: files.some(
      (file) => file.error,
    ),
    [t.components.uploader.OperationUploader.errors_exist]:
      globalErrors?.length,
  }).find(([, value]) => value)?.[0]

  const isUploadable = !nonUploadableReason

  const { data: levels, error: levelError } = useLevels({ suspense: true })

  if (levelError) {
    setGlobalErrors([levelError.message])
  }

  const handleFileSelect = async (event: React.FormEvent<HTMLInputElement>) => {
    setGlobalErrors(null)

    if (event.currentTarget.files?.length) {
      setIsProcessing(true)

      const toFileEntry = async (file: File): Promise<FileEntry> => {
        const entry: FileEntry = { file }

        try {
          const parsed = await parseOperationFile(file)
          const patched = patchOperation(parsed, levels)

          const baseOperation = parseOperationLoose(patched)
          const editorOperation = toEditorOperation(baseOperation)

          if (Array.isArray((patched as { actions?: unknown }).actions)) {
            validateOperation(patched)
          }

          const selectedLevel = findLevelByStageName(
            levels,
            (baseOperation as any).stageName ??
              (baseOperation as any).stage_name ??
              '',
          )
          entry.operation = await toSimingOperationRemote(
            baseOperation,
            editorOperation,
            { level: selectedLevel },
          )
        } catch (e) {
          entry.error = formatError(e)
          console.warn(e)
        }

        return entry
      }

      setFiles(
        await Promise.all(Array.from(event.currentTarget.files, toFileEntry)),
      )

      setIsProcessing(false)
    } else {
      setFiles([])
    }
  }

  const handleOperationSubmit = async () => {
    if (!isUploadable || !files.length) {
      return
    }

    setIsUploading(true)
    try {
      let successCount = 0

      await Promise.allSettled(
        files.map((file) =>
          createOperation({
            content: JSON.stringify(file.operation),
            status: operationStatus,
          })
            .then(() => {
              successCount++
              updateFileWhere((candidate) => candidate === file, {
                ...file,
                uploaded: true,
              })
            })
            .catch((e) => {
              console.warn(e)
              updateFileWhere((candidate) => candidate === file, {
                ...file,
                error: t.components.uploader.OperationUploader.upload_failed({
                  error: formatError(e),
                }),
              })
            }),
        ),
      )

      const errorCount = files.length - successCount

      AppToaster.show({
        intent: 'success',
        message: t.components.uploader.OperationUploader.upload_complete({
          successCount,
          errorCount,
        }),
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <DrawerLayout
      title={
        <>
          <Icon icon="cloud-upload" />
          <span className="ml-2 mr-4">
            {t.components.uploader.OperationUploader.upload_local_jobs}
          </span>
        </>
      }
    >
      <div className="h-full overflow-auto py-4 px-8 pt-8 mr-0.5 leading-relaxed">
        <H4>{t.components.uploader.OperationUploader.upload_local_jobs}</H4>

        <p>
          {t.components.uploader.OperationUploader.edit_before_upload_message}
          <Tag minimal className="mx-1">
            {t.components.uploader.OperationUploader.edit_json}
          </Tag>
          {t.components.uploader.OperationUploader.import_job}
        </p>

        <FormGroup
          className="mt-4"
          label={
            <span className="font-bold">
              {t.components.uploader.OperationUploader.select_job_files}
            </span>
          }
          labelFor="file-input"
          labelInfo={t.components.uploader.OperationUploader.json_files_only}
        >
          <FileInput
            large
            fill
            disabled={isUploading || isProcessing}
            buttonText={t.components.uploader.OperationUploader.browse}
            text={
              files.length
                ? t.components.uploader.OperationUploader.file_count({
                    count: files.length,
                  })
                : t.components.uploader.OperationUploader.choose_files
            }
            inputProps={{
              accept: '.json',
              multiple: true,
            }}
            onInputChange={handleFileSelect}
          />
        </FormGroup>

        <Tooltip2
          fill
          className="mt-4"
          placement="top"
          disabled={!nonUploadableReason}
          content={nonUploadableReason}
        >
          {(() => {
            const settledCount = files.filter(
              (file) => file.uploaded || file.error,
            ).length

            return (
              // do not use <Button> because its disabled state does not work well with Tooltip
              <AnchorButton
                large
                fill
                disabled={!isUploadable}
                icon={
                  isUploading ? (
                    <Spinner
                      size={SpinnerSize.SMALL}
                      value={settledCount / files.length}
                    />
                  ) : (
                    'cloud-upload'
                  )
                }
                onClick={handleOperationSubmit}
              >
                {isUploading
                  ? `${settledCount}/${files.length}`
                  : t.components.uploader.OperationUploader.upload}
              </AnchorButton>
            )
          })()}
        </Tooltip2>

        {globalErrors && (
          <Callout
            className="mt-4"
            intent="danger"
            icon="error"
            title={t.components.uploader.OperationUploader.error}
          >
            {globalErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </Callout>
        )}

        {!!files.length && (
          <div className="mt-4 font-bold">
            {t.components.uploader.OperationUploader.file_details}
          </div>
        )}
        {files.map(({ file, uploaded, error, operation }, index) => (
          <Callout
            className="mt-2"
            title={file.name}
            key={index}
            intent={uploaded ? 'success' : error ? 'danger' : 'none'}
            icon={!uploaded && !error ? 'document' : undefined}
          >
            <p className="text-black/60">
              {operation
                ? operation.doc.title ||
                  t.components.uploader.OperationUploader.untitled
                : null}
            </p>
            {error && <p className="text-red-500">{error}</p>}
          </Callout>
        ))}
      </div>
    </DrawerLayout>
  )
})
