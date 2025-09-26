import { MenuItem } from '@blueprintjs/core'

import { ChangeEventHandler, FC, useRef } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { AppToaster } from '../../Toaster'
import { updateOperationDocTitle } from './updateDocTitle'

export const FileImporter: FC<{ onImport: (content: string) => void }> = ({
  onImport,
}) => {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const contentWithTitle = updateOperationDocTitle(content, file.name)
      onImport(contentWithTitle)
    } catch (error) {
      console.warn('Failed to import file:', error)
      AppToaster.show({
        message: t.components.editor.source.FileImporter.cannot_read_file,
        intent: 'danger',
      })
    } finally {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
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
            <input
              className="hidden"
              type="file"
              accept="application/json"
              ref={inputRef}
              onChange={handleUpload}
            />
          </>
        }
      />
    </>
  )
}
