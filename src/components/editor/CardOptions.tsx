import { Button, ButtonProps, Menu, MenuItem, PopoverNext } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC } from 'react'

import { useTranslation } from '../../i18n/i18n'

export const CardDuplicateOption: FC<ButtonProps> = ({ className, ...props }) => {
  const t = useTranslation()

  return (
    <Button
      minimal
      icon="duplicate"
      title={t.components.editor.CardOptions.duplicate}
      className={clsx('-my-2', className)}
      {...props}
    />
  )
}

export const CardEditOption: FC<ButtonProps> = ({ className, ...props }) => {
  const t = useTranslation()

  return (
    <Button
      minimal
      icon="edit"
      title={t.components.editor.CardOptions.edit}
      className={clsx('-my-2', className)}
      {...props}
    />
  )
}

export const CardDeleteOption: FC<ButtonProps> = ({ className, onClick, ...props }) => {
  const t = useTranslation()

  return (
    <PopoverNext
      placement="right"
      content={
        <Menu className="p-0">
          <MenuItem intent="danger" text={t.components.editor.CardOptions.delete} icon="trash" onClick={onClick} />
        </Menu>
      }
    >
      <Button
        minimal
        icon="trash"
        title={t.components.editor.CardOptions.delete}
        className={clsx('-my-2', className)}
        {...props}
      />
    </PopoverNext>
  )
}
