import { Tooltip, TooltipProps } from '@blueprintjs/core'

import { FC, useEffect, useState } from 'react'

import { formatDateTime, formatRelativeTime } from '../utils/times'

interface RelativeTimeProps {
  moment: string | number | Date
  className?: string
  TooltipProps?: Omit<TooltipProps, 'content'>
}

export const RelativeTime: FC<RelativeTimeProps> = ({ moment, className, TooltipProps }) => {
  // Convert to timestamp if needed
  const timestamp = typeof moment === 'string' || moment instanceof Date ? new Date(moment).getTime() : moment

  const formattedDate = formatDateTime(timestamp)
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(timestamp))
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp))
    }, 5000)
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <Tooltip content={formattedDate} {...TooltipProps} disabled={!formattedDate}>
      <span className={className}>{relativeTime}</span>
    </Tooltip>
  )
}
