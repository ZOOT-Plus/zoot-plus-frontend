import { useSetAtom } from 'jotai'
import { useAtomDevtools } from 'jotai-devtools'
import { useAtomCallback } from 'jotai/utils'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { OperationEditor } from 'components/editor2/Editor'

import { createOperation, getOperation, updateOperation, useOperation } from '../apis/operation'
import { withSuspensable } from '../components/Suspensable'
import { AppToaster } from '../components/Toaster'
import { stripOperationExportFields } from '../services/operation'
import {
  defaultEditorState,
  editorAtoms,
  historyAtom,
} from '../components/editor2/editor-state'
import { toEditorOperation } from '../components/editor2/reconciliation'
import { toSimingOperationRemote } from '../components/editor2/siming-export'
import { useLevels } from '../apis/level'
import { findLevelByStageName } from '../models/level'
import { parseShortCode } from '../models/shortCode'
import { parseOperationLoose } from '../components/editor2/validation/schema'
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
  const { data: levels } = useLevels({ suspense: false })
  const [searchParams, setSearchParams] = useSearchParams()
  const importShortcode = searchParams.get('shortcode')
  const importedShortcodeRef = useRef<string | null>(null)

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAtomDevtools(historyAtom, { name: 'editorStateAtom' })
  }

  useLayoutEffect(() => {
    // 将后端返回的预计算关卡信息注入全局，供 InfoEditor 使用
    ;(window as any).__editor_preLevel = apiOperation?.preLevel
    if (apiOperation) {
      resetEditor({
        operation: toEditorOperation(
          parseOperationLoose(JSON.parse(apiOperation.content)),
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

  useEffect(() => {
    if (!importShortcode) {
      importedShortcodeRef.current = null
      return
    }

    if (importedShortcodeRef.current === importShortcode) {
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const shortCodeContent = parseShortCode(importShortcode)

        if (!shortCodeContent) {
          throw new Error(
            t.components.editor.source.ShortCodeImporter.invalid_shortcode,
          )
        }

        const operationData = await getOperation({ id: shortCodeContent.id })
        const operationContent = operationData.parsedContent

        if (
          operationContent.doc.title ===
          t.models.converter.invalid_operation_content
        ) {
          throw new Error(
            t.components.editor.source.ShortCodeImporter.cannot_parse_content,
          )
        }

        const sanitizedContent = stripOperationExportFields(
          operationContent as unknown as Record<string, unknown>,
        )
        const parsedOperation = parseOperationLoose(sanitizedContent)

        resetEditor({
          operation: toEditorOperation(parsedOperation),
          metadata: {
            visibility:
              operationData.status === CopilotInfoStatusEnum.Public
                ? 'public'
                : 'private',
          },
        })
        importedShortcodeRef.current = importShortcode
      } catch (error) {
        console.warn(error)
        AppToaster.show({
          intent: 'danger',
          message:
            t.components.editor.source.ShortCodeImporter.load_failed +
            formatError(error),
        })
        importedShortcodeRef.current = importShortcode
      } finally {
        if (cancelled) {
          return
        }
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('shortcode')
          return next
        }, { replace: true })
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [
    importShortcode,
    resetEditor,
    setSearchParams,
    t,
    formatError,
  ])

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
        // 解析所选关卡，便于洞窟时设置 cave_type
        const selectedLevel = levels
          ? findLevelByStageName(
              levels,
              (baseOperation as any).stageName ?? (baseOperation as any).stage_name ?? editorOperation.stageName ?? editorOperation['stage_name'] ?? '',
            )
          : undefined

        // 调试输出：创建作业时打印当前选择的关卡分类信息
        if (selectedLevel) {
          // eslint-disable-next-line no-console
          console.log(
            '[CreateOperation] level meta:',
            {
              game: selectedLevel.game,
              catOne: selectedLevel.catOne,
              catTwo: selectedLevel.catTwo,
              catThree: selectedLevel.catThree,
              stageId: selectedLevel.stageId,
              name: selectedLevel.name,
            },
          )
        } else {
          // eslint-disable-next-line no-console
          console.log('[CreateOperation] level meta: <none>')
        }

        const operation = await toSimingOperationRemote(
          baseOperation,
          editorOperation,
          { level: selectedLevel },
        )
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
