import { Button, ButtonProps, Dialog, DialogBody, FormGroup } from '@blueprintjs/core'
import { useAtom } from 'jotai'
import { Fragment, useState } from 'react'
import { useTranslation } from '../../i18n/i18n'
import { getDefaultRequirements } from '../../models/operator'
import { editorAtoms } from './editor-state'
import { OperatorLevelEdit } from './operator/OperatorItem'

interface OperatorPresetSettingsProps extends ButtonProps {}

export const OperatorPresetSettings = (props: OperatorPresetSettingsProps) => {
  const t = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useAtom(editorAtoms.config)
  const byRarity = config.operatorPreset?.byRarity ?? {}

  return (
    <>
      <Button
        endIcon="caret-right"
        {...props}
        onClick={() => setIsOpen(true)}
        text={t.components.editor2.Settings.edit}
      />

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={t.components.editor2.Settings.operator_presets}>
        <DialogBody>
          <FormGroup label={t.components.editor2.Settings.presets_when_adding}>
            <div className="grid [grid-template-columns:repeat(2,minmax(0,auto))] gap-2 justify-start items-center">
              {[6, 5, 4, 3, 2, 1, 0].map((rarity) => (
                <Fragment key={rarity}>
                  <span className="text-right">
                    {rarity === 0 ? t.components.editor2.Settings.rarity({ count: rarity }) : '★'.repeat(rarity)}
                  </span>
                  <OperatorLevelEdit
                    horizontal
                    key={rarity}
                    rarity={rarity}
                    level={byRarity[rarity]?.level ?? getDefaultRequirements(rarity).level}
                    elite={byRarity[rarity]?.elite ?? getDefaultRequirements(rarity).elite}
                    onChange={({ level, elite }) => {
                      setConfig({
                        operatorPreset: {
                          byRarity: {
                            ...byRarity,
                            [rarity]: { level, elite },
                          },
                        },
                      })
                    }}
                  />
                </Fragment>
              ))}
            </div>
          </FormGroup>
          <Button
            minimal
            outlined
            intent="danger"
            text={t.components.editor2.Settings.reset_to_default}
            onClick={() => {
              setConfig({ operatorPreset: undefined })
            }}
          />
        </DialogBody>
      </Dialog>
    </>
  )
}
