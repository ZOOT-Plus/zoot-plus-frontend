import { Button, ButtonProps } from '@blueprintjs/core'

import clsx from 'clsx'

interface FieldResetButtonProps extends ButtonProps {
  disabled?: boolean
  onReset: () => void
}

export const FieldResetButton = ({ disabled, onReset, ...buttonProps }: FieldResetButtonProps) => {
  return (
    <Button
      small
      minimal
      disabled={disabled}
      className={clsx(
        'invisible pointer-events-none',
        !disabled && '[.bp4-input-group:hover_&]:visible pointer-events-auto',
      )}
      icon="cross"
      onClick={() => onReset()}
      {...buttonProps}
    />
  )
}
