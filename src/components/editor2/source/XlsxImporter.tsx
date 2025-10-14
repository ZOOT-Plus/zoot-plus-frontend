import { Button, Dialog, DialogBody, MenuItem } from '@blueprintjs/core'

import { ChangeEventHandler, FC, useMemo, useRef, useState } from 'react'

import {
  convertXlsxToAutoFightJson,
  detectXlsxPalette,
  hexToNamedColor,
  type DetectedColor,
} from 'features/auto-fight-gen/convert'
import { useTranslation } from '../../../i18n/i18n'
import { AppToaster } from '../../Toaster'
import { updateOperationDocTitle } from './updateDocTitle'

export const XlsxImporter: FC<{ onImport: (content: string) => void }> = ({
  onImport,
}) => {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isMappingOpen, setIsMappingOpen] = useState(false)
  const [pendingBuffer, setPendingBuffer] = useState<ArrayBuffer | null>(null)
  const [pendingFileName, setPendingFileName] = useState<string>('')
  const [palette, setPalette] = useState<DetectedColor[]>([])
  const [colorOrder, setColorOrder] = useState<string[]>([])

  const handleUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      // 先检测 Excel 中的颜色（包含色块），若发现则进入颜色映射流程
      const pal = detectXlsxPalette(buffer, { colorType: 'fill' })
      if (pal.length > 0) {
        setPendingBuffer(buffer)
        setPendingFileName(file.name)
        setPalette(pal)
        setColorOrder(pal.map((p) => p.rgb))
        setIsMappingOpen(true)
        return
      }

      // 未发现颜色时，按旧流程直接转换
      const json = convertXlsxToAutoFightJson(buffer)
      const jsonWithTitle = updateOperationDocTitle(json, file.name)
      onImport(jsonWithTitle)
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



  const confirmMapping = async () => {
    if (!pendingBuffer) {
      setIsMappingOpen(false)
      return
    }
    try {
      const tokens = colorOrder.map((_, idx) => String.fromCharCode('A'.charCodeAt(0) + idx))
      const json = convertXlsxToAutoFightJson(pendingBuffer, {
        useColor: true,
        colorType: 'fill',
        colorList: tokens,
        paletteHexList: colorOrder,
        colorTokenList: tokens,
      })
      const jsonWithTitle = updateOperationDocTitle(json, pendingFileName)
      onImport(jsonWithTitle)
      AppToaster.show({
        message: t.components.editor.source.XlsxImporter.import_success,
        intent: 'success',
      })
    } catch (error) {
      console.warn('Failed to convert with color mapping', error)
      AppToaster.show({
        message: t.components.editor.source.XlsxImporter.import_failed,
        intent: 'danger',
      })
    } finally {
      setIsMappingOpen(false)
      setPendingBuffer(null)
      setPendingFileName('')
      setPalette([])
      setColorOrder([])
    }
  }

  const cancelMapping = () => {
    setIsMappingOpen(false)
    setPendingBuffer(null)
    setPendingFileName('')
    setPalette([])
    setColorOrder([])
  }

  return (
    <>
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

      <Dialog
        isOpen={isMappingOpen}
        onClose={cancelMapping}
        title="敌人颜色顺序"
      >
        <DialogBody>
          <div className="mb-2">已检测到以下敌人颜色，请设置敌方目标顺序：</div>
          {palette.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {palette.map((p, i) => (
                <span
                  key={`${p.rgb}-${i}`}
                  title={p.rgb}
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    backgroundColor: p.rgb,
                    border: '1px solid #ccc',
                  }}
                />
              ))}
            </div>
          )}
          {palette.length === 0 ? (
            <div>未检测到颜色</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {colorOrder.map((selected, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ width: 64 }}>第{idx + 1}个敌人</span>
                  <span
                    title={selected}
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      backgroundColor: selected,
                      border: '1px solid #ccc',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {palette.map((p, i) => (
                      <button
                        key={`${idx}-${p.rgb}-${i}`}
                        type="button"
                        onClick={() => {
                          const next = [...colorOrder]
                          next[idx] = p.rgb
                          setColorOrder(next)
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: p.rgb,
                          border: selected === p.rgb ? '2px solid #106BA3' : '1px solid #ccc',
                          cursor: 'pointer',
                        }}
                        aria-label={`选择颜色 ${p.rgb}`}
                        title={p.rgb}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <Button onClick={cancelMapping}>取消</Button>
            <Button intent="primary" onClick={confirmMapping}>
              确认
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
