import { useSetAtom } from 'jotai'
import { useAtomDevtools } from 'jotai-devtools'
import { useAtomCallback } from 'jotai/utils'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { OperationEditor } from 'components/editor2/Editor'

import { useLevels } from '../apis/level'
import {
  createOperation,
  getOperation,
  updateOperation,
  useOperation,
} from '../apis/operation'
import type { OperationMetadataPayload } from '../apis/operation'
import { withSuspensable } from '../components/Suspensable'
import { AppToaster } from '../components/Toaster'
import {
  defaultEditorState,
  editorAtoms,
  historyAtom,
} from '../components/editor2/editor-state'
import type { EditorMetadata } from '../components/editor2/types'
import { toEditorOperation } from '../components/editor2/reconciliation'
import { toSimingOperationRemote } from '../components/editor2/siming-export'
import { parseOperationLoose } from '../components/editor2/validation/schema'
import { editorValidationAtom } from '../components/editor2/validation/validation'
import { i18n, useTranslation } from '../i18n/i18n'
import { CopilotDocV1 } from '../models/copilot.schema'
import { findLevelByStageName } from '../models/level'
import { Level } from '../models/operation'
import { parseShortCode } from '../models/shortCode'
import { stripOperationExportFields } from '../services/operation'
import { formatError } from '../utils/error'
import { wrapErrorMessage } from '../utils/wrapErrorMessage'

type CamelLevelMeta = CopilotDocV1.LevelMeta | undefined

const buildCamelLevelMeta = (
  level: Level | undefined,
  stageName?: string,
  existing?: CamelLevelMeta,
): CamelLevelMeta => {
  if (level) {
    return {
      stageId: level.stageId,
      levelId: level.levelId,
      name: level.name,
      game: level.game,
      catOne: level.catOne,
      catTwo: level.catTwo,
      catThree: level.catThree,
      width: level.width,
      height: level.height,
    }
  }
  if (existing) {
    if (!existing.stageId && stageName) {
      return {
        ...existing,
        stageId: stageName,
      }
    }
    return existing
  }
  if (!stageName) {
    return undefined
  }
  return {
    stageId: stageName,
  }
}

const toSnakeLevelMeta = (meta: CamelLevelMeta) =>
  meta
    ? {
        stage_id: meta.stageId,
        level_id: meta.levelId,
        name: meta.name,
        game: meta.game,
        cat_one: meta.catOne,
        cat_two: meta.catTwo,
        cat_three: meta.catThree,
        width: meta.width,
        height: meta.height,
      }
    : undefined

export const EditorPage = withSuspensable(() => {
  const params = useParams()
  const navigate = useNavigate()
  const id = params.id ? +params.id : undefined
  const isNew = !id

  const [preLevel, setPreLevel] = useState<Level | undefined>(undefined)
  const setEditorPreLevel = useCallback(
    (level?: Level) => {
      setPreLevel(level)
    },
    [setPreLevel],
  )

  const apiOperation = useOperation({
    id,
    suspense: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  }).data
  const t = useTranslation()
  const resetEditor = useSetAtom(editorAtoms.reset)
  const setMetadataLocked = useSetAtom(editorAtoms.metadataLocked)
  const { data: levels } = useLevels({ suspense: false })
  const [searchParams, setSearchParams] = useSearchParams()
  const importShortcode = searchParams.get('shortcode')
  const importedShortcodeRef = useRef<string | null>(null)

  const validateMetadata = useCallback(
    (metadata: EditorMetadata) => {
      if (metadata.sourceType !== 'repost') {
        return { ok: true as const }
      }
      const missingFields: string[] = []
      if (!metadata.repostAuthor?.trim()) {
        missingFields.push(t.components.editor2.InfoEditor.repost_author)
      }
      if (!metadata.repostPlatform?.trim()) {
        missingFields.push(t.components.editor2.InfoEditor.repost_platform)
      }
      if (!metadata.repostUrl?.trim()) {
        missingFields.push(t.components.editor2.InfoEditor.repost_link)
      }
      if (missingFields.length > 0) {
        return {
          ok: false as const,
          message: t.pages.editor.validation.metadata_missing({
            fields: missingFields.join('、'),
          }),
        }
      }
      try {
        // eslint-disable-next-line no-new
        new URL(metadata.repostUrl!.trim())
      } catch {
        return {
          ok: false as const,
          message: t.pages.editor.validation.metadata_invalid_url,
        }
      }
      return { ok: true as const }
    },
    [t],
  )

  const buildMetadataPayload = useCallback(
    (metadata: EditorMetadata): OperationMetadataPayload => {
      const tidy = (value?: string) => {
        const normalized = value?.trim()
        return normalized && normalized.length > 0 ? normalized : undefined
      }
      const sourceType = metadata.sourceType ?? 'original'
      if (sourceType !== 'repost') {
        return { sourceType: 'original' }
      }
      return {
        sourceType: 'repost',
        repostAuthor: tidy(metadata.repostAuthor),
        repostPlatform: tidy(metadata.repostPlatform),
        repostUrl: tidy(metadata.repostUrl),
      }
    },
    [],
  )

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAtomDevtools(historyAtom, { name: 'editorStateAtom' })
  }

  useLayoutEffect(() => {
    // 将后端返回的预计算关卡信息注入全局，供 InfoEditor 使用
    setEditorPreLevel(apiOperation?.preLevel)
    if (apiOperation) {
      const serverMetadata = apiOperation?.metadata
      resetEditor({
        operation: toEditorOperation(
          parseOperationLoose(JSON.parse(apiOperation.content)),
        ),
        metadata: {
          visibility:
            apiOperation.status === CopilotInfoStatusEnum.Public
              ? 'public'
              : 'private',
          sourceType:
            serverMetadata?.sourceType === 'repost' ? 'repost' : 'original',
          repostAuthor: serverMetadata?.repostAuthor ?? '',
          repostPlatform: serverMetadata?.repostPlatform ?? '',
          repostUrl: serverMetadata?.repostUrl ?? '',
        },
      })
    } else {
      resetEditor(defaultEditorState)
    }
  }, [apiOperation, resetEditor, setEditorPreLevel])

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
        setEditorPreLevel(operationData.preLevel)
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
            // 神秘代码导入：默认仅自己可见
            visibility: 'private',
            // 修正：导入后本次编辑视为“搬运”；
            // 若原作业为搬运则沿用原作业元数据；否则填充上传者/平台/链接。
            sourceType: 'repost',
            repostAuthor:
              (operationData.metadata?.sourceType === 'repost'
                ? operationData.metadata?.repostAuthor
                : operationData.uploader) ?? '',
            repostPlatform:
              (operationData.metadata?.sourceType === 'repost'
                ? operationData.metadata?.repostPlatform
                : '作业站') ?? '',
            repostUrl:
              (operationData.metadata?.sourceType === 'repost'
                ? operationData.metadata?.repostUrl
                : `https://share.maayuan.top/?op=${operationData.id}`) ?? '',
          },
        })
        // 神秘代码导入：锁定作业来源编辑，保护原作者
        setMetadataLocked(true)
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
        if (!cancelled) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.delete('shortcode')
              return next
            },
            { replace: true },
          )
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [importShortcode, resetEditor, setSearchParams, setEditorPreLevel, t])

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
        const editorMetadata = get(editorAtoms.metadata)
        const metadataValidation = validateMetadata(editorMetadata)
        if (!metadataValidation.ok) {
          AppToaster.show({
            message: metadataValidation.message,
            intent: 'danger',
          })
          return false
        }
        const metadataPayload = buildMetadataPayload(editorMetadata)
        // 解析所选关卡，便于洞窟时设置 cave_type
        const selectedLevel = levels
          ? findLevelByStageName(
              levels,
              (baseOperation as any).stageName ??
                (baseOperation as any).stage_name ??
                editorOperation.stageName ??
                editorOperation['stage_name'] ??
                '',
            )
          : undefined

        // 调试输出：创建作业时打印当前选择的关卡分类信息
        if (selectedLevel) {
          // eslint-disable-next-line no-console
          console.log('[CreateOperation] level meta:', {
            game: selectedLevel.game,
            catOne: selectedLevel.catOne,
            catTwo: selectedLevel.catTwo,
            catThree: selectedLevel.catThree,
            stageId: selectedLevel.stageId,
            name: selectedLevel.name,
          })
        } else {
          // eslint-disable-next-line no-console
          console.log('[CreateOperation] level meta: <none>')
        }

        const stageNameCandidate =
          (baseOperation as any).stage_name ??
          (baseOperation as any).stageName ??
          editorOperation.stageName ??
          (editorOperation as any).stage_name ??
          ''

        const camelLevelMeta = buildCamelLevelMeta(
          selectedLevel,
          stageNameCandidate,
          editorOperation.levelMeta,
        )

        const editorOperationWithMeta = { ...editorOperation }
        if (camelLevelMeta) {
          editorOperationWithMeta.levelMeta = camelLevelMeta
        } else {
          delete (editorOperationWithMeta as any).levelMeta
        }
        set(editorAtoms.operation, editorOperationWithMeta)

        const snakeLevelMeta = toSnakeLevelMeta(camelLevelMeta)
        if (snakeLevelMeta) {
          ;(baseOperation as any).level_meta = snakeLevelMeta
        } else {
          delete (baseOperation as any).level_meta
        }

        const levelForExport: Level | undefined =
          selectedLevel ??
          (camelLevelMeta
            ? {
                stageId: camelLevelMeta.stageId ?? '',
                levelId: camelLevelMeta.levelId ?? '',
                name: camelLevelMeta.name ?? '',
                game: camelLevelMeta.game ?? '',
                catOne: camelLevelMeta.catOne ?? '',
                catTwo: camelLevelMeta.catTwo ?? '',
                catThree: camelLevelMeta.catThree ?? '',
                width: camelLevelMeta.width ?? 0,
                height: camelLevelMeta.height ?? 0,
              }
            : undefined)

        const operation = await toSimingOperationRemote(
          baseOperation,
          editorOperationWithMeta,
          { level: levelForExport },
        )
        const status =
          editorMetadata.visibility === 'public'
            ? CopilotInfoStatusEnum.Public
            : CopilotInfoStatusEnum.Private

        const upload = async () => {
          if (id) {
            await updateOperation({
              id,
              content: JSON.stringify(operation),
              status,
              metadata: metadataPayload,
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
              metadata: metadataPayload,
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
      [buildMetadataPayload, id, levels, navigate, validateMetadata],
    ),
  )

  return (
    <OperationEditor
      preLevel={preLevel}
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
