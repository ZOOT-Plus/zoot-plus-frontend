import { Card, H4 } from '@blueprintjs/core'

import { MaaUserInfo } from 'maa-copilot-client'
import { FC } from 'react'

import { useTranslation } from '../../i18n/i18n'

interface UserStatsCardProps {
  user: MaaUserInfo
  operationCount?: number
}

export const UserStatsCard: FC<UserStatsCardProps> = ({
  user,
  operationCount,
}) => {
  const t = useTranslation()

  const stats = [
    {
      label: t.components.UserStats.following,
      value: user.followingCount ?? 0,
    },
    {
      label: t.components.UserStats.fans,
      value: user.fansCount ?? 0,
    },
    {
      label: t.components.UserStats.operations,
      value: operationCount ?? 0,
    },
  ]

  return (
    <Card className="flex items-stretch mb-4 py-3 px-0">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`flex-1 flex flex-col items-center justify-center ${
            index > 0 ? 'border-l border-gray-200' : ''
          }`}
        >
          <H4 className="mb-0">{stat.value}</H4>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </div>
      ))}
    </Card>
  )
}
