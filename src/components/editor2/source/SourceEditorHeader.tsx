import { Button, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import { FC, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { AppToaster } from '../../Toaster'
import { FileImporter } from './FileImporter'
import { ShortCodeImporter } from './ShortCodeImporter'
import { XlsxImporter } from './XlsxImporter'
import { BiyongImporter } from './BiyongImporter'
import { stripOperationExportFields } from '../../../services/operation'

interface SourceEditorHeaderProps {
  text: string
  onChange: (text: string) => void
  onImport?: (text: string) => void
}

export const SourceEditorHeader: FC<SourceEditorHeaderProps> = ({
  text,
  onChange,
  onImport,
}) => {
  const t = useTranslation()
  const [importDropdownOpen, setImportDropdownOpen] = useState(false)

  const handleImport = (content: string) => {
    setImportDropdownOpen(false)
    if (onImport) {
      onImport(content)
    } else {
      onChange(content)
    }
  }

  const handleCopy = () => {
    let output = text
    try {
      const obj = JSON.parse(text) as Record<string, unknown>
      const sanitized = stripOperationExportFields(obj)
      output = JSON.stringify(sanitized, null, 2)
    } catch (_) {
      // ignore parse error, fallback to original text
    }
    navigator.clipboard.writeText(output)

    AppToaster.show({
      message: t.components.editor.source.SourceEditorHeader.json_copied,
      intent: 'success',
    })
  }

  const handleDownload = () => {
    let title: string | undefined
    let output = text
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      const sanitized = stripOperationExportFields(parsed)
      output = JSON.stringify(sanitized, null, 2)
      title = (sanitized as unknown as CopilotDocV1.Operation).doc.title
    } catch (error) {
      console.warn(error)
    }

    const blob = new Blob([output], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `MAACopilot_${title || t.components.editor.source.SourceEditorHeader.untitled}.json`
    link.click()
    URL.revokeObjectURL(url)

    AppToaster.show({
      message: t.components.editor.source.SourceEditorHeader.job_json_downloaded,
      intent: 'success',
    })
  }

  return (
    <>
      <Icon icon="manually-entered-data" />
      <span className="ml-2">
        {t.components.editor.source.SourceEditorHeader.edit_json}
      </span>

      <div className="flex-1" />

      <Popover2
        minimal
        position="bottom-left"
        isOpen={importDropdownOpen}
        onClose={() => setImportDropdownOpen(false)}
        content={
          <Menu>
            <FileImporter onImport={handleImport} />
            <XlsxImporter onImport={handleImport} />
            <ShortCodeImporter onImport={handleImport} />
            <BiyongImporter onImport={handleImport} />
          </Menu>
        }
      >
        <Button
          className="mr-4"
          icon="import"
          text={t.components.editor.source.SourceEditorHeader.import}
          rightIcon="caret-down"
          onClick={() => setImportDropdownOpen((prev) => !prev)}
        />
      </Popover2>

      <Popover2
        minimal
        position="bottom-left"
        content={
          <Menu>
            <MenuItem
              icon="clipboard"
              text={t.components.editor.source.SourceEditorHeader.copy}
              onClick={handleCopy}
            />
            <MenuItem
              icon="download"
              text={t.components.editor.source.SourceEditorHeader.download}
              onClick={handleDownload}
            />
          </Menu>
        }
      >
        <Button
          className="mr-4"
          icon="export"
          text={t.components.editor.source.SourceEditorHeader.export}
          rightIcon="caret-down"
        />
      </Popover2>
    </>
  )
}
