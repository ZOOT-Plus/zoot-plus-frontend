import { Button, ButtonProps, Dialog, DialogBody, FormGroup, Switch } from '@blueprintjs/core'
import { useAtom } from 'jotai'
import { useState } from 'react'

import { useTranslation } from '../../../../i18n/i18n'
import { NumericInput2 } from '../../../editor/NumericInput2'
import { editorAtoms } from '../../core/editor-state'
import { OperatorPresetSettings } from './OperatorPresetSettings'

interface SettingsProps extends ButtonProps {}

export const Settings = (props: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false)
  // 历史框被清空时的本地空态：清空不写配置，重新聚焦时再显示真实值
  const [historyLimitCleared, setHistoryLimitCleared] = useState(false)
  const [config, setConfig] = useAtom(editorAtoms.config)
  const t = useTranslation()

  return (
    <>
      <Button icon="cog" {...props} onClick={() => setIsOpen(true)} title={t.components.editor2.Settings.title} />

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={t.components.editor2.Settings.title}>
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
              // 清空时 NumericInput2 回调 NaN：Math.max(NaN, 5) 仍是 NaN 并会写进持久化配置，
              // 而直接回填下限 5 又会让后续输入被拼接成 530 之类，所以清空只走本地空态
              value={historyLimitCleared ? '' : config.historyLimit}
              onFocus={() => setHistoryLimitCleared(false)}
              onValueChange={(value) => {
                if (Number.isNaN(value)) {
                  setHistoryLimitCleared(true)
                  return
                }
                setHistoryLimitCleared(false)
                setConfig({ historyLimit: Math.max(value, 5) })
              }}
              min={5}
              stepSize={5}
            />
          </FormGroup>
        </DialogBody>
      </Dialog>
    </>
  )
}
