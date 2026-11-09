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
  // 历史框被清空时的本地空态：清空不写配置，重新聚焦时再显示真实值
  const [historyLimitCleared, setHistoryLimitCleared] = useState(false)
  const [config, setConfig] = useAtom(editorAtoms.config)
  const t = useTranslation()

  // 清空态是编辑中间态，开关对话框时都要丢弃，否则下次打开显示的还是上一次的空框
  const setOpen = (next: boolean) => {
    setHistoryLimitCleared(false)
    setIsOpen(next)
  }

  return (
    <>
      <Button icon="cog" {...props} onClick={() => setOpen(true)} title={t.components.editor2.Settings.title} />

      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setOpen(false)
          // 未失焦就关窗时等不到 clampValueOnBlur 的夹取回调，这里兜底回下限，
          // 顺带修掉历史版本写坏并持久化成 null 的配置
          const limit =
            Number.isFinite(config.historyLimit) && config.historyLimit >= HISTORY_LIMIT_MIN
              ? config.historyLimit
              : HISTORY_LIMIT_MIN
          if (limit !== config.historyLimit) setConfig({ historyLimit: limit })
        }}
        title={t.components.editor2.Settings.title}
      >
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
                // 输入过程中原样写入：提前夹到 5 会让受控值在敲第一个数字时就跳成 5，
                // 后续数字被拼接，最终存下的和输入的不是同一个数。
                // 下限由 clampValueOnBlur 在失焦时以夹取后的值再次回调来兜底
                setConfig({ historyLimit: value })
              }}
              min={HISTORY_LIMIT_MIN}
              stepSize={5}
            />
          </FormGroup>
        </DialogBody>
      </Dialog>
    </>
  )
}
