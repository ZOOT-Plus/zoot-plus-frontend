import { MenuItem } from '@blueprintjs/core'

import { ChangeEventHandler, FC, useRef } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { AppToaster } from '../../Toaster'
import { updateOperationDocTitle } from './updateDocTitle'
import { roundActionsToEditorActions } from '../action/roundMapping'
import { toMaaOperation } from '../reconciliation'

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
      // 使用与 siming-export.ts 一致的方式解析 baseUrl
      const baseUrl =
        (import.meta as any).env?.VITE_SIMING_BASE_URL ||
        (typeof process !== 'undefined' &&
          (process as any).env?.VITE_SIMING_BASE_URL) ||
        'http://127.0.0.1:49481'

      const form = new FormData()
      form.append('file', file, file.name)

      const resp = await fetch(
        `${String(baseUrl).replace(/\/$/, '')}/api/actions/import`,
        {
          method: 'POST',
          body: form,
        },
      )

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Siming导入接口失败: ${resp.status} ${text}`)
      }

      const data: { actions?: Record<string, unknown> } = await resp.json()
      if (!data?.actions || typeof data.actions !== 'object') {
        throw new Error('Siming导入接口返回空内容')
      }

      // 后端返回的是“回合动作”结构：Record<string, string[][]>
      // 需要先转换为 EditorAction[]，再转成标准 MAA 作业结构
      const editorActions = roundActionsToEditorActions(
        data.actions as unknown as Record<string, string[][]>,
      )
      const editorOperation = {
        minimumRequired: 'v4.0.0',
        doc: { title: file.name },
        opers: [],
        groups: [],
        actions: editorActions,
      }

      const maaOperation = toMaaOperation(
        editorOperation as unknown as Parameters<typeof toMaaOperation>[0],
      )
      const content = JSON.stringify(maaOperation, null, 2)
      onImport(content)
    } catch (error) {
      console.warn('Failed to import file via Siming:', error)
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
