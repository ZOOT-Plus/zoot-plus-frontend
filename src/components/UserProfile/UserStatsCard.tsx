import { Card, H4 } from '@blueprintjs/core'

import { useAtomValue } from 'jotai'
import { MaaUserInfo } from 'maa-copilot-client'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTranslation } from '../../i18n/i18n'
import { authAtom } from '../../store/auth'

interface UserStatsCardProps {
  user: MaaUserInfo
  operationCount?: number
}

export const UserStatsCard: FC<UserStatsCardProps> = ({
  user,
  operationCount,
}) => {
  const t = useTranslation()
  const navigate = useNavigate()
  const auth = useAtomValue(authAtom)
  const isSelf = auth.userId === user.id

  const stats = [
    {
      label: t.components.UserStats.following,
      value: user.followingCount ?? 0,
      path: isSelf && user.id ? `/user/${user.id}/following` : undefined,
    },
    {
      label: t.components.UserStats.fans,
      value: user.fansCount ?? 0,
      path: isSelf && user.id ? `/user/${user.id}/fans` : undefined,
    },
    {
      label: t.components.UserStats.operations,
      value: operationCount ?? 0,
    },
  ]

  return (
    <Card className="flex items-stretch mb-4 py-3 px-0">
      {stats.map((stat, index) => (
        <button
          key={stat.label}
          type="button"
          disabled={!stat.path}
          onClick={() => {
            if (stat.path) {
              navigate(stat.path)
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center bg-transparent border-0 ${
            index > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''
          } ${stat.path ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <H4 className="mb-0">{stat.value}</H4>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </button>
      ))}
    </Card>
  )
}
