import { Button, Card, Classes, Tag } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { FC, useCallback, useState } from 'react'

import { useTranslation } from '../../i18n/i18n'
import {
  follow,
  isFollowing as checkIsFollowing,
  unfollow,
} from '../../apis/follow'
import { authAtom } from '../../store/auth'
import { formatError } from '../../utils/error'
import { CardTitle } from '../CardTitle'
import { AppToaster } from '../Toaster'

interface UserProfileHeaderProps {
  user: MaaUserInfo
  onFollowChange?: (newRelation: MaaUserInfoRelationEnum) => void
}

export const UserProfileHeader: FC<UserProfileHeaderProps> = ({
  user,
  onFollowChange,
}) => {
  const t = useTranslation()
  const auth = useAtomValue(authAtom)
  const isSelf = auth.userId === user.id
  const isLoggedIn = !!auth.token

  const [relation, setRelation] = useState(user.relation)
  const [loading, setLoading] = useState(false)

  const following = checkIsFollowing(relation)
  const isMutual = relation === MaaUserInfoRelationEnum.Mutual
  const isFollowBy = relation === MaaUserInfoRelationEnum.FollowedBy

  const handleFollowToggle = useCallback(async () => {
    if (!user.id || loading) return

    setLoading(true)
    try {
      if (following) {
        await unfollow(Number(user.id))
        const newRelation = isMutual ? MaaUserInfoRelationEnum.FollowedBy : MaaUserInfoRelationEnum.None
        setRelation(newRelation)
        onFollowChange?.(newRelation)
        AppToaster.show({
          intent: 'success',
          message: t.components.UserProfile.unfollowSuccess,
        })
      } else {
        await follow(Number(user.id))
        const newRelation = isFollowBy ? MaaUserInfoRelationEnum.Mutual : MaaUserInfoRelationEnum.Following
        setRelation(newRelation)
        onFollowChange?.(newRelation)
        AppToaster.show({
          intent: 'success',
          message: t.components.UserProfile.followSuccess,
        })
      }
    } catch (err) {
      AppToaster.show({
        intent: 'danger',
        message: formatError(err),
      })
    } finally {
      setLoading(false)
    }
  }, [following, isMutual, isFollowBy, loading, onFollowChange, t, user.id])

  return (
    <Card className="flex flex-col mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle icon="user" large>
          {user.userName}
        </CardTitle>

        {user.activated === false && (
          <Tag minimal intent="warning">
            {t.components.UserProfile.notActivated}
          </Tag>
        )}
      </div>

      {!isSelf && isLoggedIn && (
        <Button
          intent={following ? 'none' : 'primary'}
          icon={isMutual ? 'swap-horizontal' : following ? 'tick' : 'plus'}
          loading={loading}
          onClick={handleFollowToggle}
          minimal={following}
          fill
        >
          {isMutual
            ? t.components.UserProfile.mutual
            : following
              ? t.components.UserProfile.following
              : isFollowBy
                ? t.components.UserProfile.followBack
                : t.components.UserProfile.follow}
        </Button>
      )}

      {!isLoggedIn && (
        <div className={clsx(Classes.TEXT_MUTED, 'text-sm')}>
          {t.components.UserProfile.loginToFollow}
        </div>
      )}
    </Card>
  )
}
