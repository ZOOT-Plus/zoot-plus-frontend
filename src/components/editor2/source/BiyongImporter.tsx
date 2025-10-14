import { Button, Dialog, MenuItem, TextArea } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { AppToaster } from '../../Toaster'
import { roundActionsToEditorActions } from '../action/roundMapping'
import { toMaaOperation } from '../reconciliation'
import { createOperator } from '../factories'
import { EditorOperator } from '../types'

/**
 * 辟雍导入（粘贴 JSON）：将回合动作/opers 粘贴内容转换为标准 MAA 作业 JSON。
 */
export const BiyongImporter: FC<{ onImport: (content: string) => void }> = ({
  onImport,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [jsonText, setJsonText] = useState<string>('')

  // 兼容性映射：辟雍历史标记到标准令牌
  // 需求：数字+圈（如 1圈/２圈/10圈）→ 额外:吕布
  // 说明：历史文档中的 “N圈/X圈” 为占位写法，这里的 N/X 实为数字
  const mapLegacyToken = (token: string): string => {
    const t = token.trim()
    // 将全角数字转为半角，便于统一匹配（０-９ → 0-9）
    const ascii = t.replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    )
    // 1) 数字+圈（如 1圈/10圈）统一映射为“额外:吕布”
    if (/^[0-9]+圈$/u.test(ascii)) return '额外:吕布'
    // 2) 兼容极少数历史写法：字母 N/X + 圈（大小写不敏感）
    if (/^[NX]圈$/iu.test(ascii)) return '额外:吕布'
    return t
  }

  const handleSubmit = async () => {
    try {
      setPending(true)
      const data = JSON.parse(jsonText) as unknown

      // 兼容两种顶层形态：{ actions: {...} } 或直接 { "1": [["1普"]] }
      const top =
        data &&
        typeof data === 'object' &&
        (data as any).actions &&
        typeof (data as any).actions === 'object'
          ? (data as any).actions
          : data

      // 轻量校验：应为 Record<string, (string[] | string)[]>，内部最终归一到 string[][]
      if (!top || typeof top !== 'object') {
        throw new Error('无效的 JSON 结构')
      }
      const entries = Object.entries(top as Record<string, unknown>)
      if (!entries.length) {
        throw new Error('JSON 为空')
      }

      // 归一化
      const normalized: Record<string, string[][]> = {}
      for (const [roundKey, list] of Object.entries(top as Record<string, unknown>)) {
        const arr = Array.isArray(list) ? (list as unknown[]) : []
        const rows: string[][] = arr
          .map((entry) => {
            if (Array.isArray(entry)) {
              const v = String(entry[0] ?? '')
              const norm = v.replace(/：/g, ':').replace(/\s+/g, '').trim()
              return [mapLegacyToken(norm)]
            }
            const v = String(entry ?? '')
            const norm = v.replace(/：/g, ':').replace(/\s+/g, '').trim()
            return [mapLegacyToken(norm)]
          })
          .filter((r) => r[0])
        normalized[String(Number.parseInt(roundKey, 10) || roundKey)] = rows
      }

      // 解析 opers：支持 [string|object] 数组，或 { slot: string|object } 映射
      const rawOpers = (data as any).opers
      const parsedOpers: EditorOperator[] = []
      if (Array.isArray(rawOpers)) {
        for (const item of rawOpers) {
          if (typeof item === 'string') {
            parsedOpers.push(createOperator({ name: item }))
          } else if (item && typeof item === 'object' && typeof (item as any).name === 'string') {
            const { name, requirements, skill, skillUsage, skillTimes } = item as any
            parsedOpers.push(
              createOperator({ name, requirements, skill, skillUsage, skillTimes }),
            )
          }
        }
      } else if (rawOpers && typeof rawOpers === 'object') {
        const entries = Object.entries(rawOpers as Record<string, any>).sort(
          ([a], [b]) => Number(a) - Number(b),
        )
        for (const [, item] of entries) {
          if (typeof item === 'string') {
            parsedOpers.push(createOperator({ name: item }))
          } else if (item && typeof item === 'object' && typeof (item as any).name === 'string') {
            const { name, requirements, skill, skillUsage, skillTimes } = item as any
            parsedOpers.push(
              createOperator({ name, requirements, skill, skillUsage, skillTimes }),
            )
          }
        }
      }

      const editorActions = roundActionsToEditorActions(normalized)

      const docTitle =
        (data as any)?.doc && typeof (data as any).doc.title === 'string' && (data as any).doc.title.trim()
          ? (data as any).doc.title
          : '辟雍导入'

      const editorOperation = {
        minimumRequired: 'v4.0.0',
        doc: { title: docTitle },
        opers: parsedOpers,
        groups: [],
        actions: editorActions,
      }

      const maaOperation = toMaaOperation(
        editorOperation as unknown as Parameters<typeof toMaaOperation>[0],
      )
      const content = JSON.stringify(maaOperation, null, 2)
      onImport(content)
      setDialogOpen(false)
      setJsonText('')
      AppToaster.show({ message: '已导入辟雍 JSON（含密探）', intent: 'success' })
    } catch (error) {
      console.warn('Failed to import Biyong JSON:', error)
      AppToaster.show({ message: '无法解析 JSON 或格式不正确', intent: 'danger' })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <MenuItem
        icon="import"
        shouldDismissPopover={false}
        onClick={() => setDialogOpen(true)}
        text={'辟雍导入（粘贴 JSON）'}
      />
      <Dialog
        className="w-full max-w-3xl"
        isOpen={dialogOpen}
        icon="import"
        title={'辟雍导入（粘贴 JSON）'}
        onClose={() => {
          if (!pending) setDialogOpen(false)
        }}
      >
        <div className="flex flex-col gap-3 px-4 pt-4 pb-5">
          <TextArea
            fill
            rows={14}
            growVertically={false}
            placeholder={'在此粘贴辟雍 JSON 内容（支持包含 actions 与 opers）'}
            value={jsonText}
            onChange={(e) => setJsonText((e.target as HTMLTextAreaElement).value)}
          />
          <div className="flex justify-end gap-2">
            <Button text="取消" onClick={() => setDialogOpen(false)} disabled={pending} />
            <Button intent="primary" icon="import" loading={pending} onClick={handleSubmit}>
              导入
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
