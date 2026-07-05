import { Button, Drawer, DrawerSize } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { SheetGroupContainer } from './sheet/SheetGroup'
import { SheetOperatorContainer } from './sheet/SheetOperator'
import { SheetProvider, SheetProviderProp } from './sheet/SheetProvider'

type EditorSheetProps = Omit<SheetProviderProp, 'children'>
export type Group = CopilotDocV1.Group
export type Operator = CopilotDocV1.Operator

const EditorOperatorSheet = (sheetProps: EditorSheetProps) => (
  <SheetProvider {...sheetProps}>
    <article className="overflow-y-auto">
      <SheetOperatorContainer />
      <SheetGroupContainer />
    </article>
  </SheetProvider>
)

export const EditorSheetTrigger: FC<EditorSheetProps> = (sheetProps) => {
  const t = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Drawer isOpen={open} onClose={() => setOpen(false)} size={DrawerSize.LARGE} className="max-w-[900px]">
        <EditorOperatorSheet {...sheetProps} />
      </Drawer>
      <Button onClick={() => setOpen(true)} text={t.components.editor.operator.EditorSheet.quick_edit} fill />
    </>
  )
}
