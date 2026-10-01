import { isString } from 'lodash-es'
import { memo, ReactNode } from 'react'

import { Callout, CalloutProps, Icon } from '@blueprintjs/core'
import { useEditorValidation } from '../core/validation'

export const Validator = memo(() => {
  useEditorValidation()
  return null
})
Validator.displayName = 'Validator'

interface IssuesDisplayProps extends CalloutProps {
  errors?: ReactNode[]
  warnings?: ReactNode[]
}

export function IssuesDisplay({ errors, warnings, ...props }: IssuesDisplayProps) {
  if (!errors?.length && !warnings?.length) return null
  return (
    <Callout compact {...props}>
      {errors?.map((message, i) => (
        <Callout
          minimal
          icon={null}
          intent="danger"
          className="p-0 text-xs leading-5 break-words"
          key={'e' + i + (isString(message) ? message : '')}
        >
          <Icon size={12} icon="cross-circle" className="mr-1 align-[-2px]" />
          {message}
        </Callout>
      ))}
      {warnings?.map((message, i) => (
        <Callout
          minimal
          icon={null}
          intent="warning"
          className="p-0 text-xs leading-5 break-words"
          key={'w' + i + (isString(message) ? message : '')}
        >
          <Icon size={12} icon="warning-sign" className="mr-1 align-[-2px]" />
          {message}
        </Callout>
      ))}
    </Callout>
  )
}
