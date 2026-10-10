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
    const response = await this.request({
      path: '/copilot/recommendations',
      method: 'GET',
      headers: {},
      query: { ...params },
    })
    const result = await new JSONApiResponse(response, (raw) => camelcaseKeys(raw, { deep: true })).value()
    return (result as { data: RecommendationResult }).data
  }
}

export function useRecommendations(params: RecommendationParams) {
  return useSWR(['recommendations', params], () => new RecommendationApi().get(params))
}
