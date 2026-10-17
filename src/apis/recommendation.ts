import camelcaseKeys from 'camelcase-keys'
import useSWR from 'swr'
import { BaseAPI, JSONApiResponse } from 'zoot-plus-client'

import { RecommendationParams, RecommendationResult } from 'models/recommendation'
import { createConfiguration } from 'utils/zoot-plus-client'

// Local adapter until the generated SDK includes this additive endpoint.
class RecommendationApi extends BaseAPI {
  constructor() {
    super(createConfiguration({ sendToken: 'never', requireData: true }))
  }

  async get(params: RecommendationParams): Promise<RecommendationResult> {
    const response = await this.request(
      {
        path: '/copilot/recommendations',
        method: 'GET',
        headers: {},
        query: { ...params },
      },
      { signal: AbortSignal.timeout(30_000) },
    )
    const result = await new JSONApiResponse(response, (raw) => camelcaseKeys(raw, { deep: true })).value()
    return (result as { data: RecommendationResult }).data
  }
}

export function useRecommendations(params: RecommendationParams) {
  const response = useSWR(
    ['recommendations', params],
    async ([, query]) => ({ params: query, result: await new RecommendationApi().get(query) }),
    { keepPreviousData: true },
  )
  return {
    ...response,
    data: response.data?.result,
    activities: response.data?.params.category === params.category ? response.data?.result.activities : undefined,
  }
}
