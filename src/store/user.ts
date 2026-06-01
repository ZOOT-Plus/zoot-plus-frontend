import { atom, useSetAtom } from 'jotai'
import { MaaUserInfo, MaaUserInfoRelationEnum } from 'maa-copilot-client'
import { useCallback, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'

import { follow, isFollowing, unfollow } from '../apis/follow'
import { getMe, getUserInfo } from '../apis/user'
import { authAtom } from './auth'

// ── Jotai Atoms ──────────────────────────────────────────────

/** 当前登录用户的完整信息 */
const currentUserAtom = atom<MaaUserInfo | null>(null)

// ── Derived Atoms ────────────────────────────────────────────

/** 判断给定 userId 是否为当前用户 */
export const isMeAtom = atom((get) => {
  const auth = get(authAtom)
  return (userId: string) => auth.userId === userId
})

// ── SWR Hooks ────────────────────────────────────────────────

/** 获取当前登录用户信息 */
export function useCurrentUser({ suspense }: { suspense?: boolean } = {}) {
  const setCurrentUser = useSetAtom(currentUserAtom)

  return useSWR(
    ['currentUser'],
    async () => {
      const user = await getMe()
      setCurrentUser(user)
      return user
    },
    { suspense },
  )
}

/** 获取指定用户信息（附带与当前用户的关系） */
export function useUser({
  userId,
  suspense,
}: {
  userId?: string
  suspense?: boolean
}) {
  return useSWR(
    userId ? ['user', userId] : null,
    async ([, id]) => getUserInfo(id),
    { suspense },
  )
}

// ── Action Hooks ─────────────────────────────────────────────

/**
 * 切换关注状态
 * - 若已关注则取消关注，否则关注
 * - 操作成功后自动刷新相关 SWR 缓存
 */
export function useToggleFollow() {
  const [loading, setLoading] = useState(false)
  const { mutate } = useSWRConfig()

  const toggle = useCallback(
    async (user: MaaUserInfo) => {
      const userId = Number(user.id)
      const currentlyFollowing = isFollowing(user.relation)

      setLoading(true)
      try {
        if (currentlyFollowing) {
          await unfollow(userId)
        } else {
          await follow(userId)
        }

        // 刷新用户信息缓存
        if (user.id) {
          await mutate(['user', user.id])
        }
        // 刷新当前用户缓存（关注/粉丝数变化）
        await mutate(['currentUser'])
      } finally {
        setLoading(false)
      }
    },
    [mutate],
  )

  return { toggle, loading }
}

// ── Utility ──────────────────────────────────────────────────

/** 判断给定关系是否表示「已关注」 */
export { isFollowing, isFollowedBy } from '../apis/follow'

/** 判断当前用户是否已关注目标用户 */
export function checkIsFollowing(relation?: MaaUserInfoRelationEnum | null) {
  return isFollowing(relation)
}
