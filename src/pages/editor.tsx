import { useSetAtom } from 'jotai'
import { useAtomDevtools } from 'jotai-devtools'
import { useAtomCallback } from 'jotai/utils'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import { useCallback, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { OperationEditor } from 'components/editor2/Editor'

import {
  createOperation,
  updateOperation,
  useOperation,
} from '../apis/operation'
import { withSuspensable } from '../components/Suspensable'
import { AppToaster } from '../components/Toaster'
import {
  defaultEditorState,
  editorAtoms,
  historyAtom,
} from '../components/editor2/editor-state'
import { toEditorOperation } from '../components/editor2/reconciliation'
import { toSimingOperation } from '../components/editor2/siming-export'
import { operationLooseSchema } from '../components/editor2/validation/schema'
import { editorValidationAtom } from '../components/editor2/validation/validation'
import { i18n, useTranslation } from '../i18n/i18n'
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
        operation: toEditorOperation(
          operationLooseSchema.parse(JSON.parse(apiOperation.content)),
        ),
        metadata: {
          visibility:
            apiOperation.status === CopilotInfoStatusEnum.Public
              ? 'public'
              : 'private',
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
        const baseOperation = result.data
        const editorOperation = get(editorAtoms.operation)
        const operation = toSimingOperation(baseOperation, editorOperation)
        const status =
          get(editorAtoms.metadata).visibility === 'public'
            ? CopilotInfoStatusEnum.Public
            : CopilotInfoStatusEnum.Private

        const upload = async () => {
          if (id) {
            await updateOperation({
              id,
              content: JSON.stringify(operation),
              status,
            })
            AppToaster.show({
              message: i18n.pages.editor.edit.success,
              intent: 'success',
            })
            navigate(`/?op=${id}`)
          } else {
            const newId = await createOperation({
              content: JSON.stringify(operation),
              status,
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

        await wrapErrorMessage(
          (e) => i18n.pages.editor.upload_failed({ error: formatError(e) }),
          upload(),
        )
        return true
      },
      [id, navigate],
    ),
  )

  return (
    <OperationEditor
      subtitle={
        isNew ? t.pages.editor.create.subtitle : t.pages.editor.edit.subtitle
      }
      submitAction={
        isNew ? t.pages.editor.create.submit : t.pages.editor.edit.submit
      }
      onSubmit={handleSubmit}
    />
  )
})
