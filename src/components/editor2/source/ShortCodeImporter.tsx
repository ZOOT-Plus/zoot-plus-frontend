import { Button, Dialog, InputGroup, MenuItem } from '@blueprintjs/core'

import { getOperation } from 'apis/operation'
import { useSetAtom } from 'jotai'
import { FC, useState } from 'react'
import { useSetAtom } from 'jotai'
import { useController, useForm } from 'react-hook-form'

import { useTranslation } from '../../../i18n/i18n'
import { parseShortCode } from '../../../models/shortCode'
import { stripOperationExportFields } from '../../../services/operation'
import { formatError } from '../../../utils/error'
import { FormField2 } from '../../FormField'
import { editorAtoms } from '../editor-state'

interface ShortCodeForm {
  code: string
}

export const ShortCodeImporter: FC<{
  onImport: (content: string) => void
}> = ({ onImport }) => {
  const t = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const setMetadata = useSetAtom(editorAtoms.metadata)
  const setMetadataLocked = useSetAtom(editorAtoms.metadataLocked)

  const {
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty, isValid },
  } = useForm<ShortCodeForm>()

  const {
    field: { value, onChange },
  } = useController({
    control,
    name: 'code',
    rules: {
      required: t.components.editor.source.ShortCodeImporter.enter_shortcode,
    },
  })

  const onSubmit = handleSubmit(async ({ code }) => {
    try {
      setPending(true)

      const shortCodeContent = parseShortCode(code)

      if (!shortCodeContent) {
        throw new Error(
          t.components.editor.source.ShortCodeImporter.invalid_shortcode,
        )
      }

      const { id } = shortCodeContent
      const operationData = await getOperation({ id })
      const operationContent = operationData.parsedContent

      if (
        operationContent.doc.title ===
        t.models.converter.invalid_operation_content
      ) {
        throw new Error(
          t.components.editor.source.ShortCodeImporter.cannot_parse_content,
        )
      }

      // deal with race condition
      if (!dialogOpen) {
        return
      }

      const sanitizedContent = stripOperationExportFields(
        operationContent as unknown as Record<string, unknown>,
      )
      const prettifiedJson = JSON.stringify(sanitizedContent, null, 2)

      onImport(prettifiedJson)

      // 神秘代码导入：默认私密 + 来源元数据
      setMetadata((prev) => {
        const isRepost = operationData.metadata?.sourceType === 'repost'
        return {
          ...prev,
          visibility: 'private',
          // 修正：导入后本次编辑视为“搬运”；若原作业为搬运则沿用原作业元数据
          sourceType: 'repost',
          repostAuthor: isRepost
            ? (operationData.metadata?.repostAuthor ?? '')
            : (operationData.uploader ?? ''),
          repostPlatform: isRepost
            ? (operationData.metadata?.repostPlatform ?? '')
            : '作业站',
          repostUrl: isRepost
            ? (operationData.metadata?.repostUrl ?? '')
            : `https://share.maayuan.top/?op=${id}`,
        }
      })
      // 锁定作业来源，保护原作者
      setMetadataLocked(true)
      setDialogOpen(false)
    } catch (e) {
      console.warn(e)
      setError('code', {
        message:
          t.components.editor.source.ShortCodeImporter.load_failed +
          formatError(e),
      })
    } finally {
      setPending(false)
    }
  })

  return (
    <>
      <MenuItem
        icon="backlink"
        text={t.components.editor.source.ShortCodeImporter.import_shortcode}
        shouldDismissPopover={false}
        onClick={() => setDialogOpen(true)}
      />
      <Dialog
        className="w-full max-w-xl"
        isOpen={dialogOpen}
        title={
          t.components.editor.source.ShortCodeImporter.import_shortcode_title
        }
        icon="backlink"
        onClose={() => {
          setPending(false)
          setDialogOpen(false)
        }}
      >
        <form className="flex flex-col px-4 pt-4 pb-6" onSubmit={onSubmit}>
          <FormField2
            field="code"
            label={t.components.editor.source.ShortCodeImporter.shortcode_label}
            description={
              t.components.editor.source.ShortCodeImporter.shortcode_description
            }
            error={errors.code}
          >
            <InputGroup
              large
              placeholder="maay://..."
              value={value || ''}
              onChange={onChange}
            />
          </FormField2>

          <Button
            disabled={!isValid && !isDirty}
            intent="primary"
            loading={pending}
            type="submit"
            icon="import"
            large
          >
            {t.components.editor.source.ShortCodeImporter.import_button}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
