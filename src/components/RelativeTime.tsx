import { Tooltip2, Tooltip2Props } from '@blueprintjs/popover2'

import { FC, useEffect, useState } from 'react'

import { formatDateTime, formatRelativeTime } from '../utils/times'

interface RelativeTimeProps {
  moment: string | number | Date
  className?: string
  Tooltip2Props?: Omit<Tooltip2Props, 'content'>
}

export const RelativeTime: FC<RelativeTimeProps> = ({ moment, className, Tooltip2Props }) => {
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
    <Tooltip2 content={formattedDate} {...Tooltip2Props} disabled={!formattedDate}>
      <span className={className}>{relativeTime}</span>
    </Tooltip2>
  )
}
