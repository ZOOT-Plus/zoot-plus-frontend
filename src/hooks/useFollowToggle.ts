import { Intent } from '@blueprintjs/core'

import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { useCallback, useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'

import {
  isFollowing as checkIsFollowing,
  follow,
  unfollow,
} from '../apis/follow'
import { AppToaster } from '../components/Toaster'
import { useTranslation } from '../i18n/i18n'
import { formatError } from '../utils/error'

interface UseFollowToggleOptions {
  user: MaaUserInfo
  onRelationChange?: (newRelation: MaaUserInfoRelationEnum) => void
  onFollowed?: () => void
  onUnfollowed?: () => void
}

export function useFollowToggle({
  user,
  onRelationChange,
  onFollowed,
  onUnfollowed,
}: UseFollowToggleOptions) {
  const t = useTranslation()
  const { mutate } = useSWRConfig()
  const [relation, setRelation] = useState(user.relation)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRelation(user.relation)
  }, [user.relation])

  const following = checkIsFollowing(relation)
  const isMutual = relation === MaaUserInfoRelationEnum.Mutual
  const isFollowBy = relation === MaaUserInfoRelationEnum.FollowedBy

  const showToast = useCallback((intent: Intent, message: string) => {
    AppToaster.show({
      intent,
      message,
    })
  }, [])

  const toggleFollow = useCallback(async () => {
    if (!user.id || loading) return

    setLoading(true)
    try {
      let newRelation: MaaUserInfoRelationEnum

      if (following) {
        await unfollow(Number(user.id))
        newRelation = isMutual
          ? MaaUserInfoRelationEnum.FollowedBy
          : MaaUserInfoRelationEnum.None
        onUnfollowed?.()
        showToast('success', t.components.UserProfile.unfollowSuccess)
      } else {
        await follow(Number(user.id))
        newRelation = isFollowBy
          ? MaaUserInfoRelationEnum.Mutual
          : MaaUserInfoRelationEnum.Following
        onFollowed?.()
        showToast('success', t.components.UserProfile.followSuccess)
      }

      setRelation(newRelation)
      onRelationChange?.(newRelation)

      await mutate(['user', user.id])
      await mutate(['me'])
    } catch (err) {
      showToast('danger', formatError(err))
    } finally {
      setLoading(false)
    }
  }, [
    following,
    isFollowBy,
    isMutual,
    loading,
    mutate,
    onFollowed,
    onRelationChange,
    onUnfollowed,
    showToast,
    t,
    user.id,
  ])

  return {
    relation,
    following,
    isMutual,
    isFollowBy,
    loading,
    toggleFollow,
  }
}
