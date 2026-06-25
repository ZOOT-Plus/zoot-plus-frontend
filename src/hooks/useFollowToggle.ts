import { Intent } from '@blueprintjs/core'

import { useAtomValue } from 'jotai'
import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { useCallback, useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'

import {
  isFollowing as checkIsFollowing,
  follow,
  unfollow,
  patchFollowListUserRelation,
} from '../apis/follow'
import { AppToaster } from '../components/Toaster'
import { useTranslation } from '../i18n/i18n'
import { authAtom } from '../store/auth'
import { formatError } from '../utils/error'
import { useSWRClear } from '../utils/swr'

function isOnlyFollowingListKey(key: string): boolean {
  const isOps = key.includes('"operations"') && !key.includes('"operationSets"')
  const isOpsSet = key.includes('"operationSets"')
  return (isOps || isOpsSet) && key.includes('onlyFollowing:true')
}

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
  const auth = useAtomValue(authAtom)
  const swr = useSWRConfig()
  const clearCache = useSWRClear()
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

      const followingDelta = following ? -1 : 1
      const bumpFollowingCount = (current?: MaaUserInfo) =>
        current && {
          ...current,
          followingCount: Math.max(
            0,
            (current.followingCount ?? 0) + followingDelta,
          ),
        }

      const userId = String(user.id)
      await swr.mutate(['user', userId])
      await swr.mutate(['me'], bumpFollowingCount, { revalidate: true })
      if (auth.userId) {
        await swr.mutate(['user', auth.userId], bumpFollowingCount, {
          revalidate: true,
        })
      }

      patchFollowListUserRelation(swr, userId, newRelation)
      clearCache(isOnlyFollowingListKey)
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
    swr,
    clearCache,
    auth.userId,
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
