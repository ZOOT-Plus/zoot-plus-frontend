import { MenuItem } from '@blueprintjs/core'

import { ChangeEventHandler, FC, useRef } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { AppToaster } from '../../Toaster'

export const FileImporter: FC<{ onImport: (content: string) => void }> = ({ onImport }) => {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    try {
      onImport(await file.text())
    } catch (e) {
      console.warn('Failed to read file:', e)
      AppToaster.show({
        message: t.components.editor.source.FileImporter.cannot_read_file,
        intent: 'danger',
      })
    }
  }

  return (
    <>
      <MenuItem
        icon="document-open"
        shouldDismissPopover={false}
        onClick={() => inputRef.current?.click()}
        text={
          <>
            {t.components.editor.source.FileImporter.import_local_file}
            <input className="hidden" type="file" accept="application/json" ref={inputRef} onChange={handleUpload} />
          </>
        }
      />
    </>
  )
}
