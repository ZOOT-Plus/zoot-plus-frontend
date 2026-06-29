import { Alert, AlertProps } from '@blueprintjs/core'

import { useEffect, useState } from 'react'

import { useTranslation } from '../i18n/i18n'
import { FCC } from '../types'

interface ConfirmProps extends Omit<AlertProps, 'isOpen' | 'onConfirm'> {
  repeats?: number
  trigger: (params: { handleClick: () => void }) => React.ReactNode
  onConfirm?: () => void | Promise<void>
}

export const Confirm: FCC<ConfirmProps> = ({
  repeats = 0,
  confirmButtonText,
  intent = 'primary',
  trigger,
  onConfirm,
  ...props
}) => {
  const t = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [remainingRepeats, setRemainingRepeats] = useState(repeats)

  // Set default confirmButtonText if not provided
  confirmButtonText = confirmButtonText || t.components.Confirm.confirm

  useEffect(() => {
    if (isOpen) {
      setRemainingRepeats(repeats)
    }
  }, [isOpen, repeats])

  const handleConfirm = async () => {
    if (confirming) return
    if (remainingRepeats > 1) {
      setRemainingRepeats((prev) => prev - 1)
      return
    }

    setConfirming(true)
    try {
      await onConfirm?.()
    } catch (e) {
      console.error(e)
    }
    setConfirming(false)
    setIsOpen(false)
  }

  return (
    <>
      {trigger({ handleClick: () => setIsOpen(true) })}
      <Alert
        cancelButtonText={t.components.Confirm.cancel}
        icon={intent === 'danger' || intent === 'warning' ? 'error' : 'info-sign'}
        {...props}
        isOpen={isOpen}
        loading={confirming}
        intent={intent}
        confirmButtonText={repeats ? `${confirmButtonText} (${remainingRepeats})` : confirmButtonText}
        onCancel={() => {
          if (confirming) return
          setIsOpen(false)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
