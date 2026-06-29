import { Button, ButtonProps } from '@blueprintjs/core'

import { FC } from 'react'

import { useTranslation } from '../../../../../i18n/i18n'
import { Group, Operator } from '../../EditorSheet'
import { GroupListModifyProp } from '../SheetGroup'

export interface SheetGroupOperatorSelectProp {
  existedOperator?: Operator[]
  existedGroup?: Group[]
  groupInfo: Group
  groupUpdateHandle?: GroupListModifyProp['groupUpdateHandle']
}

interface CollapseButtonProps {
  isCollapse: boolean
  onClick: ButtonProps['onClick']
  disabled?: ButtonProps['disabled']
}

export const CollapseButton: FC<CollapseButtonProps> = ({ isCollapse, onClick, disabled }) => {
  const t = useTranslation()

  return (
    <Button
      icon={isCollapse ? 'collapse-all' : 'expand-all'}
      title={
        isCollapse
          ? t.components.editor.operator.sheet.sheetGroup.CollapseButton.collapse
          : t.components.editor.operator.sheet.sheetGroup.CollapseButton.expand
      }
      minimal
      className="cursor-pointer ml-1"
      disabled={disabled}
      onClick={onClick}
    />
  )
}
