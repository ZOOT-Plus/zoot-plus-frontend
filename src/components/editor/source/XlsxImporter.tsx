import { MenuItem } from '@blueprintjs/core'

import { ChangeEventHandler, FC, useRef } from 'react'

import { convertXlsxToAutoFightJson } from 'features/auto-fight-gen/convert'
import { useTranslation } from '../../../i18n/i18n'
import { AppToaster } from '../../Toaster'

export const XlsxImporter: FC<{ onImport: (content: string) => void }> = ({
  onImport,
}) => {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const json = convertXlsxToAutoFightJson(buffer)
      onImport(json)
      AppToaster.show({
        message: t.components.editor.source.XlsxImporter.import_success,
        intent: 'success',
      })
    } catch (error) {
      console.warn('Failed to convert xlsx into JSON', error)
      AppToaster.show({
        message: t.components.editor.source.XlsxImporter.import_failed,
        intent: 'danger',
      })
    } finally {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <MenuItem
      icon="th"
      shouldDismissPopover={false}
      onClick={() => inputRef.current?.click()}
      text={
        <>
          {t.components.editor.source.XlsxImporter.import_xlsx}
          <input
            className="hidden"
            type="file"
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
            ref={inputRef}
            onChange={handleUpload}
          />
        </>
      }
    />
  )
}
