import { Button, Drawer } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { SourceEditor, SourceEditorProps } from './SourceEditor'

interface SourceEditorButtonProps extends SourceEditorProps {
  className?: string
}

export const SourceEditorButton: FC<SourceEditorButtonProps> = ({ className, triggerValidation, ...editorProps }) => {
  const t = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <Button
        className={className}
        icon="manually-entered-data"
        text={t.components.editor.source.SourceEditorButton.edit_json}
        onClick={() => {
          // trigger validation on open
          triggerValidation()
          setDrawerOpen(true)
        }}
      />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawerOpen && <SourceEditor triggerValidation={triggerValidation} {...editorProps} />}
      </Drawer>
    </>
  )
}
