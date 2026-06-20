import useSWR from 'swr'

import { MaaUserInfo } from 'maa-copilot-client'

import { UserApi } from '../utils/maa-copilot-client'

// ── User API Service ────────────────────────────────────────

/**
 * 获取当前登录用户信息
 * 需要携带 JWT token
 */
export async function getMe(): Promise<MaaUserInfo> {
  const res = await new UserApi({
    sendToken: 'always',
    requireData: true,
  }).getMe()

  return res.data!
}

/**
 * 获取指定用户信息（附带与当前用户的关系）
 * 未登录也可调用（sendToken: 'optional'），此时 relation 为 null
 */
export async function getUserInfo(userId: string): Promise<MaaUserInfo> {
  const res = await new UserApi({
    sendToken: 'optional',
    requireData: true,
  }).getUserInfo({ userId })

  return res.data!
}

// ── SWR Hooks ────────────────────────────────────────────────

/**
 * 获取当前登录用户信息的 SWR hook
 */
export function useMe({ suspense }: { suspense?: boolean } = {}) {
  return useSWR(
    ['me'],
    async () => {
      return getMe()
    },
    { suspense },
  )
}

/**
 * 获取指定用户信息的 SWR hook
 * 当 userId 为 undefined 时不会发起请求
 */
export function useUserInfo({
  userId,
  suspense,
}: {
  userId?: string
  suspense?: boolean
}) {
  return useSWR(
    userId ? ['user', userId] : null,
    async ([, id]) => {
      return getUserInfo(id)
    },
    { suspense },
  )
}

export function useUserSearch({ keyword }: { keyword?: string }) {
  return useSWR(
    keyword ? ['userSearch', keyword] : null,
    async ([, keyword]) => {
      const res = await new UserApi({
        sendToken: 'never',
        requireData: true,
      }).searchUsers({
        userName: keyword,
      })
      return res.data
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  )
}
