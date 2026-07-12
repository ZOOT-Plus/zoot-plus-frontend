import { useSetAtom } from 'jotai'
import { useAtomDevtools } from 'jotai-devtools'
import { useAtomCallback } from 'jotai/utils'
import { CopilotSetStatus } from 'zoot-plus-client'
import { useCallback, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { OperationEditor } from 'components/editor2/Editor'

import { createOperation, updateOperation, useOperation } from '../apis/operation'
import { withSuspensable } from '../components/Suspensable'
import { AppToaster } from '../components/Toaster'
import { defaultEditorState, editorAtoms, historyAtom } from '../components/editor2/editor-state'
import { toEditorOperation } from '../components/editor2/reconciliation'
import { operationLooseSchema } from '../components/editor2/validation/schema'
import { editorValidationAtom } from '../components/editor2/validation/validation'
import { i18n, useTranslation } from '../i18n/i18n'
import { CopilotType } from '../models/operation'
import { formatError } from '../utils/error'
import { wrapErrorMessage } from '../utils/wrapErrorMessage'

export const EditorPage = withSuspensable(() => {
  const params = useParams()
  const navigate = useNavigate()
  const id = params.id ? +params.id : undefined
  const isNew = !id
  const apiOperation = useOperation({
    id,
    suspense: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  }).data
  const t = useTranslation()
  const resetEditor = useSetAtom(editorAtoms.reset)

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAtomDevtools(historyAtom, { name: 'editorStateAtom' })
  }

  useLayoutEffect(() => {
    if (apiOperation) {
      resetEditor({
        operation: toEditorOperation(operationLooseSchema.parse(JSON.parse(apiOperation.content))),
        metadata: {
          visibility: apiOperation.status === CopilotSetStatus.Public ? 'public' : 'private',
          type: (apiOperation.type as CopilotType) ?? CopilotType.PRTS,
          typeLocked: true,
          videoUrl: apiOperation.videoUrl ?? '',
        },
      })
    } else {
      resetEditor(defaultEditorState)
    }
  }, [apiOperation, resetEditor])

  const handleSubmit = useAtomCallback(
    useCallback(
      async (get, set) => {
        const result = set(editorValidationAtom)
        if (!result.success) {
          set(editorAtoms.errorsVisible, true)
          AppToaster.show({
            message: i18n.pages.editor.validation_error,
            intent: 'danger',
          })
          return false
        }
        const operation = result.data
        const metadata = get(editorAtoms.metadata)
        const type = metadata.type

        if (type === CopilotType.VIDEO && !metadata.videoUrl.trim()) {
          AppToaster.show({
            message: i18n.pages.editor.video_url_required,
            intent: 'danger',
          })
          return false
        }

        const status =
          metadata.visibility === 'public' ? CopilotSetStatus.Public : CopilotSetStatus.Private

        // VIDEO 类型把视频链接写进 content；PRTS 类型不带该字段
        const content =
          type === CopilotType.VIDEO
            ? JSON.stringify({ ...operation, video_url: metadata.videoUrl.trim() })
            : JSON.stringify(operation)

        const upload = async () => {
          if (id) {
            await updateOperation({
              id,
              content,
              status,
              type,
            })
            AppToaster.show({
              message: i18n.pages.editor.edit.success,
              intent: 'success',
            })
            navigate(`/?op=${id}`)
          } else {
            const newId = await createOperation({
              content,
              status,
              type,
            })
            AppToaster.show({
              message: i18n.pages.editor.create.success,
              intent: 'success',
            })
            if (newId) {
              navigate(`/?op=${newId}`)
            } else {
              navigate('/')
            }
          }
        }

        await wrapErrorMessage((e) => i18n.pages.editor.upload_failed({ error: formatError(e) }), upload())
        return true
      },
      [id, navigate],
    ),
  )

  return (
    <OperationEditor
      subtitle={isNew ? t.pages.editor.create.subtitle : t.pages.editor.edit.subtitle}
      submitAction={isNew ? t.pages.editor.create.submit : t.pages.editor.edit.submit}
      onSubmit={handleSubmit}
    />
  )
})
