import { Button, Card } from '@blueprintjs/core'

import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { FC, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSWRConfig } from 'swr'

import {
  isFollowing as checkIsFollowing,
  follow,
  unfollow,
} from '../apis/follow'
import { useTranslation } from '../i18n/i18n'
import { formatError } from '../utils/error'
import { AppToaster } from './Toaster'

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
  const { mutate } = useSWRConfig()
  const [relation, setRelation] = useState(user.relation)
  const [fansCount, setFansCount] = useState(user.fansCount ?? 0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRelation(user.relation)
    setFansCount(user.fansCount ?? 0)
  }, [user.fansCount, user.relation])

  const following = checkIsFollowing(relation)
  const isMutual = relation === MaaUserInfoRelationEnum.Mutual
  const isFollowBy = relation === MaaUserInfoRelationEnum.FollowedBy
  const isSelf = relation === MaaUserInfoRelationEnum.Self
  const followButtonText = isMutual
    ? t.components.UserProfile.mutual
    : following
      ? t.components.UserProfile.following
      : isFollowBy
        ? t.components.UserProfile.followBack
        : t.components.UserProfile.follow
  const followButtonClassName = [
    'w-24 h-8 shrink-0 rounded !inline-flex !items-center !justify-center !px-3 !text-center !font-medium !shadow-none [&_.bp4-button-text]:w-full [&_.bp4-button-text]:text-center',
    !following
      ? '!border !border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700 dark:!border-blue-500 dark:!bg-blue-500 dark:hover:!border-blue-400 dark:hover:!bg-blue-400'
      : '!border !border-slate-200 !bg-slate-200 !text-slate-700 hover:!border-slate-300 hover:!bg-slate-300 dark:!border-slate-600 dark:!bg-slate-700 dark:!text-slate-100 dark:hover:!border-slate-500 dark:hover:!bg-slate-600',
  ].join(' ')

  const handleFollowToggle = useCallback(async () => {
    if (!user.id || loading) return

    setLoading(true)
    try {
      if (following) {
        await unfollow(Number(user.id))
        setRelation(
          isMutual
            ? MaaUserInfoRelationEnum.FollowedBy
            : MaaUserInfoRelationEnum.None,
        )
        setFansCount((count) => Math.max(count - 1, 0))
      } else {
        await follow(Number(user.id))
        setRelation(
          isFollowBy
            ? MaaUserInfoRelationEnum.Mutual
            : MaaUserInfoRelationEnum.Following,
        )
        setFansCount((count) => count + 1)
      }

      await mutate(['user', user.id])
      await mutate(['currentUser'])
    } catch (err) {
      AppToaster.show({
        intent: 'danger',
        message: formatError(err),
      })
    } finally {
      setLoading(false)
    }
  }, [following, isFollowBy, isMutual, loading, mutate, user.id])

  return (
    <Card
      onClick={() => navigate(`/profile/${user.id}`)}
      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {/* Avatar placeholder */}
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium">
          {user.userName?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* User info */}
        <div>
          <div className="font-medium">{user.userName}</div>
          <div className="text-sm text-gray-500">
            {user.followingCount ?? 0} {t.components.UserStats.following} ·{' '}
            {fansCount} {t.components.UserStats.fans}
          </div>
        </div>
      </div>

      {/* Follow button */}
      {showFollowButton && !isSelf && (
        <Button
          className={followButtonClassName}
          intent="none"
          loading={loading}
          onClick={(e) => {
            e.stopPropagation()
            handleFollowToggle()
          }}
        >
          {followButtonText}
        </Button>
      )}
    </Card>
  )
}
