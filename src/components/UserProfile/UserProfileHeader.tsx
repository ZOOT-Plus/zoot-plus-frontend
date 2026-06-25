import { Button, Card, Classes, Tag } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { FC } from 'react'

import { useFollowToggle } from '../../hooks/useFollowToggle'
import { resolveFollowButtonText } from '../../apis/follow'
import { useTranslation } from '../../i18n/i18n'
import { authAtom } from '../../store/auth'
import { CardTitle } from '../CardTitle'

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

  const { relation, following, isMutual, loading, toggleFollow } =
    useFollowToggle({
      user,
      onRelationChange: onFollowChange,
    })

  const followButtonText = resolveFollowButtonText(
    t.components.UserProfile,
    relation,
  )

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
          onClick={toggleFollow}
          minimal={following}
          fill
        >
          {followButtonText}
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
