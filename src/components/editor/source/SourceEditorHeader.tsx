import { Button, Icon, Menu, MenuItem, PopoverNext } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { writeTextToClipboard } from 'utils/clipboard'
import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { AppToaster } from '../../Toaster'
import { FileImporter } from './FileImporter'
import { ShortCodeImporter } from './ShortCodeImporter'

interface SourceEditorHeaderProps {
  text: string
  onChange: (text: string) => void
}

export const SourceEditorHeader: FC<SourceEditorHeaderProps> = ({ text, onChange }) => {
  const t = useTranslation()
  return (
    <>
      <Icon icon="manually-entered-data" />
      <span className="ml-2">{t.components.editor.source.SourceEditorHeader.edit_json}</span>
      <div className="flex-1" />
      <SourceEditorToolbar text={text} onChange={onChange} />
    </>
  )
}

interface SourceEditorToolbarProps {
  text: string
  onChange: (text: string) => void
}

export const SourceEditorToolbar: FC<SourceEditorToolbarProps> = ({ text, onChange }) => {
  const t = useTranslation()
  const [importDropdownOpen, setImportDropdownOpen] = useState(false)

  const handleImport = (text: string) => {
    setImportDropdownOpen(false)
    onChange(text)
  }

  const handleCopy = () => {
    writeTextToClipboard(text)

    AppToaster.show({
      message: t.components.editor.source.SourceEditorHeader.json_copied,
      intent: 'success',
    })
  }

  const handleDownload = () => {
    let title: string | undefined
    try {
      title = (JSON.parse(text) as CopilotDocV1.Operation).doc.title
    } catch (e) {
      console.warn(e)
    }

    const blob = new Blob([text], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PRTSPlus_${title || t.components.editor.source.SourceEditorHeader.untitled}.json`
    link.click()
    URL.revokeObjectURL(url)

    AppToaster.show({
      message: t.components.editor.source.SourceEditorHeader.job_json_downloaded,
      intent: 'success',
    })
  }

  return (
    <>
      <PopoverNext
        animation="minimal"
        arrow={false}
        placement="bottom-start"
        isOpen={importDropdownOpen}
        onClose={() => setImportDropdownOpen(false)}
        content={
          <Menu>
            <FileImporter onImport={handleImport} />
            <ShortCodeImporter onImport={handleImport} />
          </Menu>
        }
      >
        <Button
          className="mr-4"
          icon="import"
          text={t.components.editor.source.SourceEditorHeader.import}
          rightIcon="caret-down"
          onClick={() => setImportDropdownOpen(!importDropdownOpen)}
        />
      </PopoverNext>

      <PopoverNext
        animation="minimal"
        arrow={false}
        placement="bottom-start"
        content={
          <Menu>
            <MenuItem icon="clipboard" text={t.components.editor.source.SourceEditorHeader.copy} onClick={handleCopy} />
            <MenuItem
              icon="download"
              text={t.components.editor.source.SourceEditorHeader.download}
              onClick={handleDownload}
            />
          </Menu>
        }
      >
        <Button
          icon="export"
          text={t.components.editor.source.SourceEditorHeader.export}
          rightIcon="caret-down"
        />
      </PopoverNext>
    </>
  )
}
