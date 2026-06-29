import { MaaUserInfo, MaaUserInfoRelationEnum, PagedDTOMaaUserInfo } from 'maa-copilot-client'
import useSWRInfinite from 'swr/infinite'

import { FollowApi } from '../utils/maa-copilot-client'

// ── Follow API Service ───────────────────────────────────────

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
export async function getFollowingList(page: number = 1, size: number = 20): Promise<PagedDTOMaaUserInfo> {
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
export async function getFansList(page: number = 1, size: number = 20): Promise<PagedDTOMaaUserInfo> {
  const res = await new FollowApi({
    sendToken: 'always',
    requireData: true,
  }).getFansList({ page, size })

  return res.data!
}

// ── SWR Hooks ────────────────────────────────────────────────

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
    isLoading,
    isValidating,
  } = useSWRInfinite(
    (pageIndex, previousPage: PagedDTOMaaUserInfo) => {
      if (disabled) return null
      if (previousPage && !previousPage.hasNext) return null

      return ['followList', type, pageIndex + 1, size]
    },
    async ([, listType, page, pageSize]) => {
      const fetcher = listType === 'following' ? getFollowingList : getFansList
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
    isLoading,
    isValidating,
    isReachingEnd,
  }
}

// ── Relation Helpers ────────────────────────────────────────

/**
 * 判断当前用户是否已关注目标用户
 */
export function isFollowing(relation?: MaaUserInfoRelationEnum | null): boolean {
  return relation === MaaUserInfoRelationEnum.Following || relation === MaaUserInfoRelationEnum.Mutual
}

export function resolveFollowButtonText(
  labels: {
    mutual: string
    following: string
    followBack: string
    follow: string
  },
  relation?: MaaUserInfoRelationEnum | null,
) {
  switch (relation) {
    case MaaUserInfoRelationEnum.Mutual:
      return labels.mutual
    case MaaUserInfoRelationEnum.Following:
      return labels.following
    case MaaUserInfoRelationEnum.FollowedBy:
      return labels.followBack
    default:
      return labels.follow
  }
}

// ── Follow List Cache Helpers ───────────────────────────────

const FOLLOW_LIST_KEY_MARKER = '"followList"'

export function isFollowListTypeKey(key: string, type: FollowListType): boolean {
  return key.includes(FOLLOW_LIST_KEY_MARKER) && key.includes(`"${type}"`)
}

export function patchFollowListUserRelation(
  swr: {
    cache: { keys: () => IterableIterator<string> }
    mutate: (
      key: string,
      data?: (page?: PagedDTOMaaUserInfo) => PagedDTOMaaUserInfo | undefined,
      options?: { revalidate?: boolean },
    ) => unknown
  },
  userId: string,
  newRelation: MaaUserInfoRelationEnum,
) {
  for (const key of swr.cache.keys()) {
    if (!key.includes(FOLLOW_LIST_KEY_MARKER)) continue

    swr.mutate(
      key,
      (page?: PagedDTOMaaUserInfo) => {
        if (!page?.data?.some((user) => String(user.id) === userId)) return page

        return {
          ...page,
          data: page.data.map((user) => (String(user.id) === userId ? { ...user, relation: newRelation } : user)),
        }
      },
      { revalidate: false },
    )
  }
}
