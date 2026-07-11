import { Button, Dialog, InputGroup, MenuItem } from '@blueprintjs/core'

import { getOperation } from 'apis/operation'
import { FC, useState } from 'react'
import { useController, useForm } from 'react-hook-form'

import { useTranslation } from '../../../i18n/i18n'
import { parseShortCode, useNewShortCodeProtocol } from '../../../models/shortCode'
import { formatError } from '../../../utils/error'
import { FormField2 } from '../../FormField'

interface ShortCodeForm {
  code: string
}

export const ShortCodeImporter: FC<{
  onImport: (content: string) => void
}> = ({ onImport }) => {
  const t = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)

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

      // 导入只处理作业：拒绝作业集代码（prts://s），兼容旧 maa:// 与 prts://
      if (!shortCodeContent || shortCodeContent.type === 'operation-set') {
        throw new Error(t.components.editor.source.ShortCodeImporter.invalid_shortcode)
      }

      const { id } = shortCodeContent
      const operationContent = (await getOperation({ id })).parsedContent

      if (operationContent.doc.title === t.models.converter.invalid_operation_content) {
        throw new Error(t.components.editor.source.ShortCodeImporter.cannot_parse_content)
      }

      // deal with race condition
      if (!dialogOpen) {
        return
      }

      const prettifiedJson = JSON.stringify(operationContent, null, 2)

      onImport(prettifiedJson)
      setDialogOpen(false)
    } catch (e) {
      console.warn(e)
      setError('code', {
        message: t.components.editor.source.ShortCodeImporter.load_failed + formatError(e),
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
        title={t.components.editor.source.ShortCodeImporter.import_shortcode_title}
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
            description={t.components.editor.source.ShortCodeImporter.shortcode_description}
            error={errors.code}
          >
            <InputGroup large placeholder={useNewShortCodeProtocol() ? 'prts://...' : 'maa://...'} value={value || ''} onChange={onChange} />
          </FormField2>

          <Button disabled={!isValid && !isDirty} intent="primary" loading={pending} type="submit" icon="import" large>
            {t.components.editor.source.ShortCodeImporter.import_button}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
