import { Button, ButtonProps, Dialog, DialogBody, FormGroup, Switch } from '@blueprintjs/core'
import { useAtom } from 'jotai'
import { useState } from 'react'

import { useTranslation } from '../../../../i18n/i18n'
import { NumericInput2 } from '../../../editor/NumericInput2'
import { HISTORY_LIMIT_MIN, editorAtoms } from '../../core/editor-state'
import { OperatorPresetSettings } from './OperatorPresetSettings'

interface SettingsProps extends ButtonProps {}

export const Settings = (props: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false)
  // 编辑中的值只保存在本地，失焦或关窗时才写入配置：
  // 逐键写入会把「想输 30 时的 3」这类中间值立即应用到 historyAtom，
  // 若此时发生编辑，撤销记录会按这个临时上限被裁剪，中间值也可能被持久化
  const [historyLimitDraft, setHistoryLimitDraft] = useState<number | ''>()
  const [config, setConfig] = useAtom(editorAtoms.config)
  const t = useTranslation()

  // 提交编辑中的值。清空是编辑中间态：不写配置，失焦后字段回显当前配置值
  const commitHistoryLimit = () => {
    // 点击失焦时 clampValueOnBlur 会以当前值再回调一次 onValueChange，
    // 这里先丢弃草稿，避免那次回调把「未编辑」的当前值留在本地状态里
    setHistoryLimitDraft(undefined)
    if (historyLimitDraft === undefined || historyLimitDraft === '') return
    // clampValueOnBlur 的夹取回调与本次渲染不在同一批，这里再兜一次下限
    setConfig({ historyLimit: Math.max(historyLimitDraft, HISTORY_LIMIT_MIN) })
  }

  const openSettings = () => {
    setHistoryLimitDraft(undefined)
    setIsOpen(true)
  }

  const closeSettings = () => {
    commitHistoryLimit()
    setIsOpen(false)
  }

  return (
    <>
      <Button icon="cog" {...props} onClick={openSettings} title={t.components.editor2.Settings.title} />

      <Dialog isOpen={isOpen} onClose={closeSettings} title={t.components.editor2.Settings.title}>
        <DialogBody>
          <FormGroup label={t.components.editor2.Settings.ui}>
            <Switch
              checked={config.showLinkerButtons}
              label={t.components.editor2.Settings.show_linker_buttons}
              onChange={(e) => setConfig({ showLinkerButtons: e.currentTarget.checked })}
            />
            <Switch
              checked={config.toggleSelectorPanel}
              label={t.components.editor2.Settings.auto_toggle_selector_panel}
              onChange={(e) => setConfig({ toggleSelectorPanel: e.currentTarget.checked })}
            />
            <Switch
              checked={config.showErrorsByDefault}
              label={t.components.editor2.Settings.show_errors_by_default}
              onChange={(e) => setConfig({ showErrorsByDefault: e.currentTarget.checked })}
            />
          </FormGroup>
          <FormGroup label={t.components.editor2.Settings.operator_presets}>
            <OperatorPresetSettings />
          </FormGroup>
          <FormGroup
            label={t.components.editor2.Settings.history_limit}
            helperText={t.components.editor2.Settings.history_limit_note}
          >
            <NumericInput2
              intOnly
              clampValueOnBlur
              // 编辑期间只更新本地草稿，不写配置
              value={historyLimitDraft ?? config.historyLimit}
              onValueChange={(value) => setHistoryLimitDraft(Number.isNaN(value) ? '' : value)}
              onBlur={commitHistoryLimit}
              min={HISTORY_LIMIT_MIN}
              stepSize={5}
            />
          </FormGroup>
        </DialogBody>
      </Dialog>
    </>
  )
}
