import { Button, Drawer, DrawerSize } from '@blueprintjs/core'
import { FC, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { SheetGroupContainer } from './sheet/SheetGroup'
import { SheetOperatorContainer } from './sheet/SheetOperator'
import { SheetProvider } from './sheet/SheetProvider'

const EditorOperatorSheet = () => (
  <SheetProvider>
    <article className="overflow-y-auto">
      <SheetOperatorContainer />
      <SheetGroupContainer />
    </article>
  </SheetProvider>
)

export const LegacyQuickEditDrawer: FC = () => {
  const t = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Drawer isOpen={open} onClose={() => setOpen(false)} size={DrawerSize.LARGE} className="max-w-[900px]">
        <EditorOperatorSheet />
      </Drawer>
      <Button onClick={() => setOpen(true)} text={t.components.editor.operator.EditorSheet.quick_edit} fill />
    </>
  )
}
