import { uniqBy } from 'lodash-es'
import {
  BanCommentsStatusEnum,
  CopilotCUDRequest,
  CopilotInfoFromJSON,
  CopilotInfoStatusEnum,
  QueriesCopilotRequest,
} from 'maa-copilot-client'
import useSWR, { SWRConfiguration } from 'swr'
import useSWRInfinite from 'swr/infinite'

import { toCopilotOperation } from 'models/converter'
import { OpRatingType, Operation, OperationMetadata } from 'models/operation'
import { ShortCodeContent, parseShortCode } from 'models/shortCode'
import { OperationApi } from 'utils/maa-copilot-client'
import { useSWRRefresh } from 'utils/swr'

export type OrderBy = 'views' | 'hot' | 'id'

export interface OperatorFilterParams {
  included: string[]
  excluded: string[]
}

export interface UseOperationsParams {
  limit?: number
  orderBy?: OrderBy
  descending?: boolean
  keyword?: string
  levelKeyword?: string
  operator?: OperatorFilterParams
  operationIds?: number[]
  uploaderId?: string

  disabled?: boolean
  suspense?: boolean
  revalidateFirstPage?: boolean
}

export function useOperations({
  limit = 50,
  orderBy,
  descending = true,
  keyword,
  levelKeyword,
  operator,
  operationIds,
  uploaderId,
  disabled,
  suspense,
  revalidateFirstPage,
}: UseOperationsParams) {
  const {
    error,
    data: pages,
    setSize,
    isValidating,
  } = useSWRInfinite(
    (pageIndex, previousPage: { hasNext: boolean }) => {
      if (disabled) {
        return null
      }
      if (previousPage && !previousPage.hasNext) {
        return null // reached the end
      }

      // 用户输入神秘代码时，只传这个 id，其他参数都不传
      if (keyword) {
        let content: ShortCodeContent | null = null

        try {
          content = parseShortCode(keyword)
        } catch (e) {
          console.warn(e)
        }

        if (content) {
          return [
            'operations',
            {
              copilotIds: [content.id],
            } satisfies QueriesCopilotRequest,
          ]
        }
      }

      return [
        'operations',
        {
          limit,
          page: pageIndex + 1,
          document: keyword,
          levelKeyword,
          operator: operator
            ? [
                ...operator.included,
                ...operator.excluded.map((o) => `~${o}`),
              ].join(',') || undefined
            : undefined,
          orderBy,
          desc: descending,
          copilotIds: operationIds,
          uploaderId,
        } satisfies QueriesCopilotRequest,
      ]
    },
    async ([, req]) => {
      // 如果指定了 id 列表，但是列表为空，就直接返回空数据。不然要是直接传空列表，就相当于没有这个参数，
      // 会导致后端返回所有数据
      if (req.copilotIds?.length === 0) {
        return { data: [], hasNext: false, total: 0 }
      }

      // 使用 Raw 接口拿到未加工 JSON，确保 metadata 不丢失
      const api = new OperationApi({ sendToken: 'optional', requireData: true })
      const rawResponse = await api.queriesCopilotRaw(req)
      const rawJson = (await rawResponse.raw.json()) as {
        data?: { data?: any[]; has_next?: boolean; page?: number; total?: number }
      }
      const payload = rawJson?.data ?? { data: [], has_next: false, total: 0 }

      let parsedOperations: Operation[] = (payload.data ?? []).map((item) => {
        const baseInfo = CopilotInfoFromJSON(item)
        return {
          ...baseInfo,
          metadata: mapResponseMetadata(item?.metadata),
          parsedContent: toCopilotOperation(baseInfo),
        }
      })

      // 如果 revalidateFirstPage=false，从第二页开始可能会有重复数据，需要去重
      parsedOperations = uniqBy(parsedOperations, (o) => o.id)

      const requestPage = 'page' in req ? req.page : undefined

      return {
        hasNext: !!payload.has_next,
        page: payload.page ?? requestPage,
        total: payload.total ?? 0,
        data: parsedOperations,
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

  const _operations = pages?.map((page) => page.data).flat() ?? []

  // 按 operationIds 的顺序排序
  const operations = operationIds?.length
    ? operationIds
        ?.map((id) => _operations?.find((v) => v.id === id))
        .filter((v) => !!v)
    : _operations

  return {
    error,
    operations,
    total,
    setSize,
    isValidating,
    isReachingEnd,
  }
}

export function useRefreshOperations() {
  const refresh = useSWRRefresh()
  return () => refresh((key) => key.includes('operations'))
}

interface UseOperationParams extends SWRConfiguration {
  id?: number
}

export function useOperation({ id, ...config }: UseOperationParams) {
  return useSWR(
    id ? ['operation', id] : null,
    () => getOperation({ id: id! }),
    config,
  )
}

export function useRefreshOperation() {
  const refresh = useSWRRefresh()
  return (id: number) =>
    refresh((key) => key.includes('operation') && key.includes(String(id)))
}

export async function getOperation(req: { id: number }): Promise<Operation> {
  const api = new OperationApi({
    sendToken: 'optional',
    requireData: true,
  })
  const rawResponse = await api.getCopilotByIdRaw(req)
  const rawJson = (await rawResponse.raw.json()) as { data?: any }
  const payload = rawJson?.data ?? {}
  const baseInfo = CopilotInfoFromJSON(payload)
  const metadata = mapResponseMetadata(payload.metadata)

  const d: any = payload
  const preLevel = (() => {
    const stageId = d.stageId ?? d.stage_id
    const levelId = d.levelId ?? d.level_id ?? stageId ?? ''
    const game = d.game ?? ''
    const name = d.name ?? ''
    const catOne = d.catOne ?? d.cat_one ?? ''
    const catTwo = d.catTwo ?? d.cat_two ?? ''
    const catThree = d.catThree ?? d.cat_three ?? ''
    if (!stageId && !catOne && !catTwo && !catThree && !name) {
      return undefined
    }
    return {
      game,
      levelId,
      stageId: stageId ?? '',
      catOne,
      catTwo,
      catThree,
      name,
      width: 0,
      height: 0,
    }
  })()

  return {
    ...baseInfo,
    metadata,
    parsedContent: toCopilotOperation(baseInfo),
    preLevel,
  }
}

export interface OperationMetadataPayload {
  sourceType: 'original' | 'repost'
  repostAuthor?: string
  repostPlatform?: string
  repostUrl?: string
}

type CopilotCUDRequestWithMetadata = CopilotCUDRequest & {
  metadata?: OperationMetadataPayload
}

function buildCopilotCUDRequest({
  metadata,
  ...rest
}: {
  id?: number
  content: string
  status: CopilotInfoStatusEnum
  metadata?: OperationMetadataPayload
}): CopilotCUDRequestWithMetadata {
  if (!metadata) {
    return rest as CopilotCUDRequestWithMetadata
  }
  return { ...rest, metadata }
}

function prepareRequestBody(payload: CopilotCUDRequestWithMetadata) {
  const metadata = payload.metadata
  if (!metadata) {
    const { metadata: _removed, ...rest } = payload
    return rest
  }
  const sanitized = {
    sourceType: metadata.sourceType ?? 'original',
    repostAuthor: metadata.repostAuthor?.trim() || undefined,
    repostPlatform: metadata.repostPlatform?.trim() || undefined,
    repostUrl: metadata.repostUrl?.trim() || undefined,
  }
  if (
    sanitized.sourceType === 'original' &&
    !sanitized.repostAuthor &&
    !sanitized.repostPlatform &&
    !sanitized.repostUrl
  ) {
    const { metadata: _removed, ...rest } = payload
    return rest
  }
  return {
    ...payload,
    metadata: sanitized,
  }
}

function mapResponseMetadata(raw: any | undefined): OperationMetadata {
  const clean = (value: unknown) => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  const source =
    (typeof raw?.sourceType === 'string' ? raw.sourceType : undefined) ??
    (typeof raw?.source_type === 'string' ? raw.source_type : undefined)

  return {
    sourceType: source?.toLowerCase() === 'repost' ? 'repost' : 'original',
    repostAuthor:
      clean(raw?.repostAuthor) ?? clean(raw?.repost_author) ?? undefined,
    repostPlatform:
      clean(raw?.repostPlatform) ?? clean(raw?.repost_platform) ?? undefined,
    repostUrl: clean(raw?.repostUrl) ?? clean(raw?.repost_url) ?? undefined,
  }
}

export async function createOperation(req: {
  content: string
  status: CopilotInfoStatusEnum
  metadata?: OperationMetadataPayload
}) {
  const payload = buildCopilotCUDRequest(req)
  const api = new OperationApi()
  const response = await api.uploadCopilotRaw(
    {
      copilotCUDRequest: payload,
    },
    async ({ init }) => {
      const bodyObject = prepareRequestBody(payload)
      return {
        ...init,
        body: bodyObject as unknown as BodyInit,
      }
    },
  )
  return (await response.value()).data
}

export async function updateOperation(req: {
  id: number
  content: string
  status: CopilotInfoStatusEnum
  metadata?: OperationMetadataPayload
}) {
  const payload = buildCopilotCUDRequest(req)
  const api = new OperationApi()
  const response = await api.updateCopilotRaw(
    {
      copilotCUDRequest: payload,
    },
    async ({ init }) => {
      const bodyObject = prepareRequestBody(payload)
      return {
        ...init,
        body: bodyObject as unknown as BodyInit,
      }
    },
  )
  await response.value()
}

export async function deleteOperation(req: { id: number }) {
  await new OperationApi().deleteCopilot({
    copilotCUDRequest: {
      content: '',
      status: CopilotInfoStatusEnum.Public,
      ...req,
    },
  })
}

export async function rateOperation(req: { id: number; rating: OpRatingType }) {
  const ratingTypeMapping: Record<OpRatingType, string> = {
    0: 'None',
    1: 'Like',
    2: 'Dislike',
  }

  await new OperationApi().ratesCopilotOperation({
    copilotRatingReq: {
      ...req,
      rating: ratingTypeMapping[req.rating],
    },
  })
}

export async function banComments(req: {
  operationId: number
  status: BanCommentsStatusEnum
}) {
  await new OperationApi().banComments({
    copilotId: req.operationId,
    ...req,
  })
}
