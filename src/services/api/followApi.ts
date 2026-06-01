import useSWRInfinite from 'swr/infinite'

import {
  MaaUserInfo,
  MaaUserInfoRelationEnum,
  PagedDTOMaaUserInfo,
} from 'maa-copilot-client'

import { FollowApi } from '../../utils/maa-copilot-client'
import { useSWRRefresh } from '../../utils/swr'

// ── Follow API Service ──────────────────────────────────────────────────────

/**
 * 关注用户
 * @param followUserId - 要关注的用户 ID（数字）
 */
export async function follow(followUserId: number): Promise<void> {
  await new FollowApi({
    sendToken: 'always',
    validateStatusCode: 'if-object',
  }).follow({ followUserId })
}

/**
 * 取消关注
 * @param followUserId - 要取消关注的用户 ID（数字）
 */
export async function unfollow(followUserId: number): Promise<void> {
  await new FollowApi({
    sendToken: 'always',
    validateStatusCode: 'if-object',
  }).unfollow({ followUserId })
}

/**
 * 获取关注列表（分页）
 * @param page - 页码，从 1 开始
 * @param size - 每页数量
 */
export async function getFollowingList(
  page: number = 1,
  size: number = 20,
): Promise<PagedDTOMaaUserInfo> {
  const res = await new FollowApi({
    sendToken: 'always',
    requireData: true,
  }).getFollowingList({ page, size })

  return res.data!
}

/**
 * 获取粉丝列表（分页）
 * @param page - 页码，从 1 开始
 * @param size - 每页数量
 */
export async function getFansList(
  page: number = 1,
  size: number = 20,
): Promise<PagedDTOMaaUserInfo> {
  const res = await new FollowApi({
    sendToken: 'always',
    requireData: true,
  }).getFansList({ page, size })

  return res.data!
}

// ── SWR Hooks ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20

export type FollowListType = 'following' | 'fans'

/**
 * 获取关注/粉丝列表的分页 SWR hook（useSWRInfinite）
 */
export function useFollowList({
  type,
  size = DEFAULT_PAGE_SIZE,
  disabled,
  suspense,
}: {
  type: FollowListType
  size?: number
  disabled?: boolean
  suspense?: boolean
}) {
  const {
    data: pages,
    error,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (pageIndex, previousPage: PagedDTOMaaUserInfo) => {
      if (disabled) return null
      if (previousPage && !previousPage.hasNext) return null

      return ['followList', type, pageIndex + 1, size]
    },
    async ([, listType, page, pageSize]) => {
      const fetcher =
        listType === 'following' ? getFollowingList : getFansList
      return fetcher(page as number, pageSize as number)
    },
    {
      suspense,
      revalidateFirstPage: false,
    },
  )

  const isReachingEnd = !!pages?.some((page) => !page.hasNext)
  const total = pages?.[0]?.total ?? 0
  const users: MaaUserInfo[] = pages?.flatMap((page) => page.data ?? []) ?? []

  return {
    users,
    total,
    error,
    setSize,
    isValidating,
    isReachingEnd,
  }
}

/**
 * 刷新关注/粉丝列表缓存
 */
export function useRefreshFollowList() {
  const refresh = useSWRRefresh()
  return () => refresh((key) => key.includes('followList'))
}

// ── Relation Helpers ────────────────────────────────────────────────────────

/**
 * 判断当前用户是否已关注目标用户
 */
export function isFollowing(relation?: MaaUserInfoRelationEnum | null): boolean {
  return (
    relation === MaaUserInfoRelationEnum.Following ||
    relation === MaaUserInfoRelationEnum.Mutual
  )
}

/**
 * 判断目标用户是否关注了当前用户（是粉丝）
 */
export function isFollowedBy(relation?: MaaUserInfoRelationEnum | null): boolean {
  return (
    relation === MaaUserInfoRelationEnum.FollowedBy ||
    relation === MaaUserInfoRelationEnum.Mutual
  )
}