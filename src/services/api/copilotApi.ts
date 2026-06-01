import { uniqBy } from 'lodash-es'
import { QueriesCopilotRequest } from 'maa-copilot-client'
import useSWRInfinite from 'swr/infinite'

import { toCopilotOperation } from '../../models/converter'
import { Operation } from '../../models/operation'
import { OperationApi } from '../../utils/maa-copilot-client'

// ── Extended Query Params ────────────────────────────────────────────────────

export interface CopilotQueryParams {
  page?: number
  limit?: number
  levelKeyword?: string
  operator?: string
  document?: string
  uploaderId?: string
  desc?: boolean
  orderBy?: string
  copilotIds?: number[]
  onlyFollowing?: boolean
}

// ── Copilot API Service ─────────────────────────────────────────────────────

/**
 * 分页查询作业列表
 * 支持 onlyFollowing 参数，仅返回已关注用户的作业
 */
export async function queryCopilots(
  params: CopilotQueryParams,
): Promise<{ data: Operation[]; hasNext: boolean; total: number }> {
  const req: QueriesCopilotRequest = {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    levelKeyword: params.levelKeyword,
    operator: params.operator,
    document: params.document,
    uploaderId: params.uploaderId,
    desc: params.desc ?? true,
    orderBy: params.orderBy,
    copilotIds: params.copilotIds,
    onlyFollowing: params.onlyFollowing ?? false,
  }

  const res = await new OperationApi({
    sendToken: 'optional',
    requireData: true,
  }).queriesCopilot(req)

  const data = res.data!
  const operations: Operation[] = (data.data ?? []).map((op) => ({
    ...op,
    parsedContent: toCopilotOperation(op),
  }))

  return {
    data: operations,
    hasNext: data.hasNext ?? false,
    total: data.total ?? 0,
  }
}

// ── SWR Hooks ───────────────────────────────────────────────────────────────

export interface UseCopilotListParams {
  limit?: number
  orderBy?: string
  descending?: boolean
  keyword?: string
  levelKeyword?: string
  operator?: string
  uploaderId?: string
  onlyFollowing?: boolean

  disabled?: boolean
  suspense?: boolean
  revalidateFirstPage?: boolean
}

/**
 * 分页加载作业列表的 SWR hook
 * 支持 onlyFollowing 参数过滤已关注用户的作业
 */
export function useCopilotList({
  limit = 50,
  orderBy,
  descending = true,
  keyword,
  levelKeyword,
  operator,
  uploaderId,
  onlyFollowing,
  disabled,
  suspense,
  revalidateFirstPage,
}: UseCopilotListParams) {
  const {
    error,
    data: pages,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (pageIndex, previousPage: { hasNext: boolean }) => {
      if (disabled) return null
      if (previousPage && !previousPage.hasNext) return null

      return [
        'copilotList',
        {
          limit,
          page: pageIndex + 1,
          document: keyword,
          levelKeyword,
          operator,
          orderBy,
          desc: descending,
          uploaderId,
          onlyFollowing: onlyFollowing ?? false,
        } satisfies QueriesCopilotRequest,
      ]
    },
    async ([, req]) => {
      const res = await new OperationApi({
        sendToken: 'optional',
        requireData: true,
      }).queriesCopilot(req as QueriesCopilotRequest)

      const data = res.data!
      let operations: Operation[] = (data.data ?? []).map((op) => ({
        ...op,
        parsedContent: toCopilotOperation(op),
      }))

      operations = uniqBy(operations, (o) => o.id)

      return {
        ...data,
        data: operations,
      }
    },
    {
      suspense,
      focusThrottleInterval: 1000 * 60 * 30,
      revalidateFirstPage,
    },
  )

  const isReachingEnd = !!pages?.some((page) => !page.hasNext)
  const total = pages?.[0]?.total ?? 0
  const operations = pages?.flatMap((page) => page.data) ?? []

  return {
    error,
    operations,
    total,
    setSize,
    isValidating,
    isReachingEnd,
  }
}