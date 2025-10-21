import {
  HTMLInputProps,
  NumericInput,
  NumericInputProps,
} from '@blueprintjs/core'

import clsx from 'clsx'
import { clamp, noop } from 'lodash-es'
import {
  WheelEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

type MixedNumericInputProps = HTMLInputProps & NumericInputProps

export interface NumericInput2Props extends MixedNumericInputProps {
  intOnly?: boolean
  onWheelFocused?: (e: React.WheelEvent<HTMLInputElement>) => void
  wheelStepSize?: number
  containerClassName?: string
}

export const NumericInput2 = ({
  intOnly,
  min,
  max,
  minorStepSize,
  value,
  onValueChange,
  onFocus,
  onWheelFocused,
  wheelStepSize,
  inputClassName,
  containerClassName,
  className,
  fill,
  buttonPosition = 'none',
  size,
  ...props
}: NumericInput2Props) => {
  const allowNegative = min === undefined || min < 0
  const handleWheelRegistered = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [endsWithDot, setEndsWithDot] = useState(false)

  if (minorStepSize && minorStepSize < 0.001) {
    // not yet fixed in current version: https://github.com/palantir/blueprint/issues/4497
    process.env.NODE_ENV === 'development' &&
      console.warn('minorStepSize cannot be smaller than 0.001')

    minorStepSize = 0.001
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
      if (newValue !== value) {
        onValueChange?.(newValue, String(newValue), e.currentTarget)
      }
    }
  }

  const handleWheel: WheelEventHandler<HTMLInputElement> = useCallback((e) => {
    handleWheelImpl.current(e)
  }, [])

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
      minorStepSize={minorStepSize}
      inputClassName={clsx(
        (wheelStepSize !== undefined || onWheelFocused !== undefined) &&
          'focus:cursor-ns-resize',
        inputClassName,
      )}
      className={clsx(containerClassName, className)}
      inputRef={inputRef}
      value={endsWithDot ? value + '.' : value}
      fill={fill}
      buttonPosition={buttonPosition}
      size={size}
      onFocus={(e) => {
        onFocus?.(e)
        if (
          (onWheelFocused || wheelStepSize !== undefined) &&
          !handleWheelRegistered.current
        ) {
          handleWheelRegistered.current = true
          e.currentTarget.addEventListener('wheel', handleWheel as any, {
            passive: false,
          })
        }
      }}
      onBlur={(e) => {
        setEndsWithDot(false)
        if (handleWheelRegistered.current) {
          e.currentTarget.removeEventListener('wheel', handleWheel as any)
          handleWheelRegistered.current = false
        }
      }}
      onButtonClick={(num, str) => onValueChange?.(num, str, inputRef.current)}
      onValueChange={(num, str, inputEl) => {
        // count hyphens to determine the sign, so that user can toggle the sign
        // by pressing hyphen key, regardless of the cursor position
        let hyphens = 0

        str = str.replace(/-/g, () => {
          hyphens++
          return ''
        })

        const dots = str.split('.').length - 1

        if (dots > 1 || (dots === 1 && intOnly)) {
          return
        }

        setEndsWithDot(str.endsWith('.'))

        num = parseFloat(str)

        if (Number.isNaN(num) || !Number.isFinite(num)) {
          return
        }

        if (allowNegative && hyphens % 2 === 1) {
          num = -num
        }

        if (intOnly) {
          num = ~~num
        }

        onValueChange?.(num, str, inputEl)
      }}
      {...props}
    />
  )
}
