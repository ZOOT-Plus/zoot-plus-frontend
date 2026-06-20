import { Icon, IconName } from '@blueprintjs/core'

import clsx from 'clsx'
import { ReactNode } from 'react'
import { FCC } from 'types'

export const FactItem: FCC<{
  icon?: IconName
  title?: ReactNode
  dense?: boolean
  relaxed?: boolean
  className?: string
}> = ({ icon, title, dense, className, relaxed, children }) => (
  <div className={clsx('flex last:mb-0', !dense && 'mb-4', !relaxed && 'items-center', className)}>
    {icon && <Icon icon={icon} className="mr-2 text-zinc-500 dark:text-slate-100" />}
    <div className="text-sm mr-2 text-zinc-500 dark:text-slate-100">{title}</div>
    {children}
  </div>
)
