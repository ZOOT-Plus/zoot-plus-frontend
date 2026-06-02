import { Button, Card } from '@blueprintjs/core'

import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTranslation } from '../i18n/i18n'
import { isFollowing, useToggleFollow } from '../store/user'

interface UserCardProps {
  user: MaaUserInfo
  showFollowButton?: boolean
}

export const UserCard: FC<UserCardProps> = ({
  user,
  showFollowButton = true,
}) => {
  const t = useTranslation()
  const navigate = useNavigate()
  const { toggle, loading } = useToggleFollow()

  const following = isFollowing(user.relation)
  const isSelf = user.relation === MaaUserInfoRelationEnum.Self

  return (
    <Card
      interactive
      onClick={() => navigate(`/profile/${user.id}`)}
      className="flex items-center justify-between"
    >
      <div className="flex items-center space-x-3">
        {/* Avatar placeholder */}
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-medium">
          {user.userName?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* User info */}
        <div>
          <div className="font-medium">{user.userName}</div>
          <div className="text-sm text-gray-500">
            {user.followingCount ?? 0}{' '}
            {t.components.UserStats.following} · {user.fansCount ?? 0}{' '}
            {t.components.UserStats.fans}
          </div>
        </div>
      </div>

      {/* Follow button */}
      {showFollowButton && !isSelf && (
        <Button
          intent={following ? 'none' : 'primary'}
          icon={following ? 'tick' : 'plus'}
          loading={loading}
          onClick={(e) => {
            e.stopPropagation()
            toggle(user)
          }}
          small
          minimal={following}
        >
          {following
            ? t.components.UserProfile.following
            : t.components.UserProfile.follow}
        </Button>
      )}
    </Card>
  )
}
