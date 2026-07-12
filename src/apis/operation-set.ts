import { useAtomValue } from 'jotai'
import { noop } from 'lodash-es'
import { CopilotSetQuery, CopilotSetStatus, CopilotSetUpdateReq, PagedDTOCopilotSetListRes } from 'zoot-plus-client'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'

import { OperationSetApi } from 'utils/zoot-plus-client'
import { useSWRRefresh } from 'utils/swr'

import { parseShortCode } from '../models/shortCode'
import { authAtom } from '../store/auth'
import { ApiError } from 'utils/error'

export type OrderBy = 'views' | 'hot' | 'id'

export interface UseOperationSetsParams {
  keyword?: string
  creatorId?: string
  onlyFollowing?: boolean
  /** 是否降序（最新在前）。@default true，与作业列表保持一致 */
  descending?: boolean

  disabled?: boolean
  suspense?: boolean
}

export function useOperationSets({
  keyword,
  creatorId,
  onlyFollowing,
  descending = true,
  disabled,
  suspense,
}: UseOperationSetsParams) {
  const auth = useAtomValue(authAtom)
  const {
    data: pages,
    error,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (pageIndex, previousPage: PagedDTOCopilotSetListRes) => {
      if (disabled) {
        return null
      }
      if (previousPage && !previousPage.hasNext) {
        return null // reached the end
      }

      return [
        'operationSets',
        {
          limit: 50,
          page: pageIndex + 1,
          keyword,
          creatorId: creatorId === 'me' ? auth.userId : creatorId,
          onlyFollowing: onlyFollowing ?? false,
          desc: descending,
        } satisfies CopilotSetQuery,
      ]
    },
    async ([, req]) => {
      const res = await new OperationSetApi({
        sendToken: 'optional', // 如果有 token 即可获取到私有的作业集
        requireData: true,
      }).querySets({ copilotSetQuery: req })
      return res.data
    },
    {
      suspense,
      focusThrottleInterval: 1000 * 60 * 30,
    },
  )

  const isReachingEnd = !!pages?.some((page) => !page.hasNext)
  const total = pages?.[0]?.total ?? 0
  const operationSets = pages?.map((page) => page.data).flat()

  return {
    operationSets,
    total,
    error,
    setSize,
    isValidating,
    isReachingEnd,
  }
}

export function useRefreshOperationSets() {
  const refresh = useSWRRefresh()
  return () =>
    refresh((key) => key.includes('operationSets') || (key.includes('operationSet') && key.includes('fromList')))
}

export function useOperationSetSearch({ keyword, suspense, disabled, ...params }: UseOperationSetsParams) {
  if (!suspense) {
    throw new Error('useOperationSetSearch must be used with suspense')
  }
  if (disabled) {
    throw new Error('useOperationSetSearch cannot be disabled')
  }

  let id: number | undefined

  if (keyword) {
    const shortCodeContent = parseShortCode(keyword)

    // maa:// 旧代码无类型标记，作业集搜索按 id 直取（与旧行为一致）
    if (
      shortCodeContent &&
      (shortCodeContent.type === 'operation-set' || shortCodeContent.type === 'legacy')
    ) {
      id = shortCodeContent.id
    }
  }

  // 按短码查单个作业集时，后端在作业集不存在时返回 400 {"message":"作业集不存在"}。
  // getSet 的 id 始终来自 parseShortCode（必为数字），唯一可能的 400 就是 not-found，
  // 把它当空结果而不是加载失败，与作业列表体验一致。其它 ApiError（5xx 等）带
  // status，不属 400，原样抛给错误边界，不再被静默吞掉。
  const { data: operationSet } = useSWR(
    id ? ['operationSet', id, 'search'] : null,
    async () => {
      try {
        return await getOperationSet({ id: id! })
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) return null
        throw e
      }
    },
    { suspense },
  )

  const listResponse = useOperationSets({
    keyword,
    suspense,
    ...params,

    // disable the list query if we are fetching a single operation set
    disabled: !!id,
  })

  if (id) {
    return {
      operationSets: operationSet ? [operationSet] : [],
      total: operationSet ? 1 : 0,
      isReachingEnd: true,
      setSize: noop,

      // these are fixed values in suspense mode
      error: undefined,
      isValidating: false,
    }
  }

  return listResponse
}

interface UseOperationSetParams {
  id?: number
  suspense?: boolean
}

export function useOperationSet({ id, suspense }: UseOperationSetParams) {
  return useSWR(id ? ['operationSet', id] : null, () => getOperationSet({ id: id! }), { suspense })
}

export function useRefreshOperationSet() {
  const refresh = useSWRRefresh()
  return (id: number) => refresh((key) => key.includes('operationSet') && key.includes(String(id)))
}

export async function getOperationSet(req: { id: number }) {
  const res = await new OperationSetApi({
    sendToken: 'optional', // 如果有 token 会用来获取用户是否点赞
    requireData: true,
  }).getSet(req)
  return res.data
}

export async function createOperationSet(req: {
  name: string
  description: string
  operationIds: number[]
  status: CopilotSetStatus
}) {
  await new OperationSetApi().createSet({
    copilotSetCreateReq: {
      name: req.name,
      description: req.description,
      copilotIds: req.operationIds,
      status: req.status,
    },
  })
}

export async function updateOperationSet(req: CopilotSetUpdateReq) {
  await new OperationSetApi().updateCopilotSet({ copilotSetUpdateReq: req })
}

export async function deleteOperationSet(req: { id: number }) {
  await new OperationSetApi().deleteCopilotSet({ commonIdReqLong: req })
}

export async function addToOperationSet(req: { operationSetId: number; operationIds: number[] }) {
  await new OperationSetApi().addCopilotIds({
    copilotSetModCopilotsReq: {
      id: req.operationSetId,
      copilotIds: req.operationIds,
    },
  })
}

export async function removeFromOperationSet(req: { operationSetId: number; operationIds: number[] }) {
  await new OperationSetApi().removeCopilotIds({
    copilotSetModCopilotsReq: {
      id: req.operationSetId,
      copilotIds: req.operationIds,
    },
  })
}
