import { Button, ButtonProps, Dialog, DialogBody, FormGroup, Switch } from '@blueprintjs/core'

import { useAtom } from 'jotai'
import { useState } from 'react'

import { useTranslation } from '../../i18n/i18n'
import { NumericInput2 } from '../editor/NumericInput2'
import { editorAtoms } from './editor-state'

interface SettingsProps extends ButtonProps {}

export const Settings = (props: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useAtom(editorAtoms.config)
  const t = useTranslation()

  return (
    <>
      <Button icon="cog" {...props} onClick={() => setIsOpen(true)} title={t.components.editor2.Settings.title} />

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={t.components.editor2.Settings.title}>
        <DialogBody>
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

          <FormGroup
            label={t.components.editor2.Settings.history_limit}
            helperText={t.components.editor2.Settings.history_limit_note}
          >
            <NumericInput2
              intOnly
              clampValueOnBlur
              value={config.historyLimit}
              onValueChange={(value) => setConfig({ historyLimit: Math.max(value, 5) })}
              min={5}
              stepSize={5}
            />
          </FormGroup>
        </DialogBody>
      </Dialog>
    </>
  )
}
