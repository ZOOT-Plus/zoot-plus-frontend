import { Button, Checkbox, Tooltip } from '@blueprintjs/core'

import { isEqual } from 'lodash-es'
import { CopilotSetStatus } from 'zoot-plus-client'
import { ComponentType, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'

import { withGlobalErrorBoundary } from 'components/GlobalErrorBoundary'
import { OperationEditor } from 'components/editor/OperationEditor'
import { TypeSwitchConfirmAlert, useTypeSwitchConfirm } from 'components/editor/CopilotTypePicker'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { createOperation, updateOperation, useOperation } from '../apis/operation'
import { withSuspensable } from '../components/Suspensable'
import { AppToaster } from '../components/Toaster'
import { patchOperation, toMaaOperation } from '../components/editor/converter'
import { SourceEditorButton } from '../components/editor/source/SourceEditorButton'
import { AutosaveOptions, AutosaveSheet, isChangedSinceLastSave, useAutosave } from '../components/editor/useAutosave'
import { validateOperation } from '../components/editor/validation'
import { useTranslation } from '../i18n/i18n'
import { toCopilotOperation } from '../models/converter'
import { CopilotType, MinimumRequired, Operation } from '../models/operation'
import { NetworkError, formatError } from '../utils/error'

const defaultOperation: CopilotDocV1.Operation = {
  minimumRequired: MinimumRequired.V4_0_0,
  stageName: '',
  // the following fields will immediately be set when passed into useForm, even if they are not set by default.
  // so we manually set them in order to check the dirtiness when determining whether the form should be autosaved.
  actions: [],
  doc: {
    title: '',
  },
  groups: [],
  opers: [],
}

const isDirty = (operation: CopilotDocV1.Operation) => !isEqual(operation, defaultOperation)

export const CreatePage: ComponentType = withGlobalErrorBoundary(
  withSuspensable(() => {
    const t = useTranslation()
    const params = useParams()
    const id = params.id ? +params.id : undefined

    const isNew = !id
    const submitAction = isNew ? t.pages.create.publish : t.pages.create.update

    const apiOperation = useOperation({ id, suspense: true }).data

    const form = useForm<CopilotDocV1.Operation>({
      // set form values by fetched data, or an empty operation by default
      defaultValues: apiOperation ? toCopilotOperation(apiOperation) : defaultOperation,
    })
    const { handleSubmit, getValues, trigger, reset, setValue, setError, clearErrors } = form

    // 作业类型：创建时可选，编辑时锁定为已保存的类型。videoUrl 仅 VIDEO 类型使用。
    const [type, setType] = useState<CopilotType>(apiOperation?.type ?? CopilotType.PRTS)
    const [videoUrl, setVideoUrl] = useState<string>(apiOperation?.videoUrl ?? '')

    // 切换类型时如有会丢失的数据，先弹窗确认后再应用
    const applyTypeChange = (next: CopilotType) => {
      if (next === CopilotType.VIDEO) {
        // PRTS → VIDEO：清空动作序列
        setValue('actions', [])
      } else {
        // VIDEO → PRTS：清空视频链接
        setVideoUrl('')
      }
      setType(next)
    }
    const { pendingType, requestChange: handleTypeChange, cancel, confirm } = useTypeSwitchConfirm({
      currentType: type,
      hasActions: () => (getValues('actions')?.length ?? 0) > 0,
      hasVideoUrl: () => !!videoUrl,
      apply: applyTypeChange,
    })

    const autosaveOptions: AutosaveOptions<CopilotDocV1.Operation> = useMemo(
      () => ({
        key: 'zoot-plus-editor',
        interval: 1000 * 60,
        limit: 20,
        shouldSave: (operation, archive) => isChangedSinceLastSave(operation, archive) && isDirty(operation),
      }),
      [],
    )

    const { archive } = useAutosave<CopilotDocV1.Operation>(getValues, autosaveOptions)

    const [operationStatus, setOperationStatus] = useState<Operation['status']>(
      apiOperation ? apiOperation.status : CopilotSetStatus.Public,
    )
    const [uploading, setUploading] = useState(false)

    const triggerValidation = async () => {
      clearErrors()

      if (!(await trigger())) {
        return false
      }

      const operation = toMaaOperation(getValues())

      return validateOperation(operation, setError)
    }

    const onSubmit = handleSubmit(async (raw: CopilotDocV1.Operation) => {
      try {
        setUploading(true)

        if (type === CopilotType.VIDEO && !videoUrl.trim()) {
          setError('global' as any, {
            message: t.pages.create.video_url_required,
          })
          return
        }

        const operation = toMaaOperation(raw)

        patchOperation(operation)

        if (!validateOperation(operation, setError)) {
          return
        }

        // VIDEO 类型把视频链接写进 content；PRTS 类型不带该字段
        const content =
          type === CopilotType.VIDEO
            ? JSON.stringify({ ...operation, video_url: videoUrl.trim() })
            : JSON.stringify(operation)

        try {
          if (isNew) {
            await createOperation({
              content,
              status: operationStatus,
              type,
            })
          } else {
            await updateOperation({
              id,
              content,
              status: operationStatus,
              type,
            })
          }
        } catch (e) {
          // handle a special error
          if (e instanceof Error && e.message.includes('is less than or equal to 0')) {
            const actionWithNegativeCostChanges =
              operation.actions?.findIndex((action) => (action?.cost_changes as number) < 0) ?? -1

            if (actionWithNegativeCostChanges !== -1) {
              throw new Error(
                t.pages.create.negative_cost_not_supported({
                  actionIndex: actionWithNegativeCostChanges + 1,
                }),
              )
            }
          }

          throw e
        }

        AppToaster.show({
          intent: 'success',
          message: isNew ? t.pages.create.task_publish_success : t.pages.create.task_update_success,
        })
      } catch (e) {
        setError('global' as any, {
          message:
            e instanceof NetworkError
              ? isNew
                ? t.pages.create.task_publish_failed({ error: e.message })
                : t.pages.create.task_update_failed({ error: e.message })
              : formatError(e),
        })
      } finally {
        setUploading(false)
      }
    })

    return (
      <>
        <OperationEditor
          form={form}
          type={type}
          typeLocked={!isNew}
          videoUrl={videoUrl}
          onChangeType={handleTypeChange}
          onChangeVideoUrl={setVideoUrl}
          toolbar={
          <>
            <AutosaveSheet
              minimal
              className="!text-xs opacity-75"
              archive={archive}
              options={autosaveOptions}
              itemTitle={(record) => record.v.doc?.title || t.pages.create.untitled}
              onRestore={(value) => reset(value, { keepDefaultValues: true })}
            />
            <SourceEditorButton className="ml-4" form={form} triggerValidation={triggerValidation} />
            <Button
              intent="primary"
              className="ml-4"
              icon="upload"
              text={submitAction}
              loading={uploading}
              onClick={() => {
                // manually clear the `global` error or else the submission will be blocked
                clearErrors()
                onSubmit()
              }}
            />
            <div className="flex-[100%_0_0]" />
            <div className="ml-auto mt-2">
              <Tooltip
                placement="bottom"
                content={
                  <>
                    {t.pages.create.public_task_description}
                    <br />
                    {t.pages.create.private_task_description}
                  </>
                }
              >
                <Checkbox
                  className="text-sm"
                  checked={operationStatus === CopilotSetStatus.Public}
                  onChange={(e) =>
                    setOperationStatus(e.currentTarget.checked ? CopilotSetStatus.Public : CopilotSetStatus.Private)
                  }
                >
                  <span className="-ml-1 opacity-75">{t.pages.create.public}</span>
                </Checkbox>
              </Tooltip>
            </div>
          </>
        }
      />
        <TypeSwitchConfirmAlert pendingType={pendingType} onCancel={cancel} onConfirm={confirm} />
      </>
    )
  }),
)
