import { Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { Fragment } from 'react'
import { FCC } from 'types'

export const HelperText: FCC<{
  className?: string
}> = ({ children, className }) => {
  const child = () => {
    if (typeof children?.[Symbol.iterator] === 'function') {
      const children_ = children as Iterable<React.ReactNode>
      return Array.from(children_).map((item, index) => (
        <Fragment key={index}>
          {!!index && <span className="mx-0.5">·</span>}
          {item}
        </Fragment>
      ))
    } else {
      return children
    }
  }

  return (
    <div className={clsx('flex text-gray-600 dark:text-zinc-400 text-xs items-center', className)}>
      <Icon icon="info-sign" size={12} className="mr-1.5" />
      <div>{child()}</div>
    </div>
  )
}
