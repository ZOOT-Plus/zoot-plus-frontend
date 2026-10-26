import { HTMLInputProps, NumericInput, NumericInputProps } from '@blueprintjs/core'

import clsx from 'clsx'
import { clamp, noop } from 'lodash-es'
import { WheelEventHandler, useCallback, useEffect, useRef, useState } from 'react'

type MixedNumericInputProps = Omit<HTMLInputProps, 'size'> & NumericInputProps

export interface LegacyNumericInputProps extends MixedNumericInputProps {
  intOnly?: boolean
  onWheelFocused?: (e: React.WheelEvent<HTMLInputElement>) => void
  wheelStepSize?: number
  emitNaNString?: boolean
}

export const LegacyNumericInput = (inputProps: LegacyNumericInputProps) => {
  const forwardedInputProps = { ...inputProps }
  delete forwardedInputProps.onValueChange
  const {
    intOnly,
    min,
    max,
    minorStepSize,
    emitNaNString,
    value,
    onFocus,
    onWheelFocused,
    wheelStepSize,
    inputClassName,
    ...props
  } = forwardedInputProps
  const notifyValueChange: NonNullable<LegacyNumericInputProps['onValueChange']> = (num, str, inputEl) =>
    inputProps.onValueChange?.(num, str, inputEl)
  const allowNegative = min === undefined || min < 0
  const handleWheelRegistered = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [endsWithDot, setEndsWithDot] = useState(false)
  const normalizedMinorStepSize = minorStepSize && minorStepSize < 0.001 ? 0.001 : minorStepSize

  if (minorStepSize && minorStepSize < 0.001) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('minorStepSize cannot be smaller than 0.001')
    }
  }

  const handleWheelImpl = useRef<WheelEventHandler<HTMLInputElement>>(noop)
  handleWheelImpl.current = (e) => {
    onWheelFocused?.(e)
    if (wheelStepSize) {
      e.preventDefault()
      const newValue = clamp(
        (Number(value) || 0) - Math.sign(e.deltaY) * wheelStepSize,
        min ?? -Number.MAX_VALUE,
        max ?? Number.MAX_VALUE,
      )
      if (newValue !== value) notifyValueChange(newValue, String(newValue), e.currentTarget)
    }
  }

  const handleWheel: WheelEventHandler<HTMLInputElement> = useCallback((e) => handleWheelImpl.current(e), [])

  useEffect(() => {
    if (handleWheelRegistered.current) {
      inputRef.current?.removeEventListener('wheel', handleWheel as any)
      handleWheelRegistered.current = false
    }
  }, [handleWheel])

  return (
    <NumericInput
      allowNumericCharactersOnly
      min={min}
      max={max}
      minorStepSize={normalizedMinorStepSize}
      inputClassName={clsx(
        (wheelStepSize !== undefined || onWheelFocused !== undefined) && 'focus:cursor-ns-resize',
        inputClassName,
      )}
      inputRef={inputRef}
      value={endsWithDot ? value + '.' : value}
      onFocus={(e) => {
        onFocus?.(e)
        if ((onWheelFocused || wheelStepSize !== undefined) && !handleWheelRegistered.current) {
          handleWheelRegistered.current = true
          e.currentTarget.addEventListener('wheel', handleWheel as any, { passive: false })
        }
      }}
      onBlur={(e) => {
        setEndsWithDot(false)
        if (handleWheelRegistered.current) {
          e.currentTarget.removeEventListener('wheel', handleWheel as any)
          handleWheelRegistered.current = false
        }
      }}
      onButtonClick={(num, str) => notifyValueChange(num, str, inputRef.current)}
      onValueChange={(num, str, inputEl) => {
        let hyphens = 0
        str = str.replace(/-/g, () => {
          hyphens++
          return ''
        })

        const dots = str.split('.').length - 1
        if (dots > 1 || (dots === 1 && intOnly)) return
        setEndsWithDot(str.endsWith('.'))

        if (str === '') {
          notifyValueChange(NaN, str, inputEl)
          return
        }

        num = parseFloat(str)
        if (Number.isNaN(num) || !Number.isFinite(num)) {
          if (emitNaNString) notifyValueChange(NaN, str, inputEl)
          return
        }

        if (allowNegative && hyphens % 2 === 1) num = -num
        if (intOnly) num = ~~num
        notifyValueChange(num, str, inputEl)
      }}
      {...props}
    />
  )
}
