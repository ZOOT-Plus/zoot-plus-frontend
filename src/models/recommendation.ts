export type RecommendationScope = 'RECENT' | 'PERMANENT' | 'HISTORY'

export interface RecommendationParams {
  days: number
  scope: RecommendationScope
  coverage: number
  stageId?: string
  category?: string
  activity?: string
  includeClosed: boolean
  includeAlternatives: boolean
  includeUncertain: boolean
}

export interface TrainingTarget {
  elite?: number | null
  level?: number | null
  skill: number
  skillLevel?: number | null
  module?: number | null
  /** Reserved for future source data; no level recommendations are currently calculated. */
  moduleLevel?: number | null
}

export interface TrainingBranch {
  target: TrainingTarget
  usageShare: number
  coverage: number
  levelDataRatio: number
  skillDataRatio: number
  moduleDataRatio: number
}

export interface RecommendationSource {
  id: number
  title: string
  stageId: string
  firstPublishedAt: string
  likes: number
  dislikes: number
  views: number
  quality: number
  alternative: boolean
}

export interface OperatorRecommendation {
  operator: { id: string; name: string; role: string; rarity: number }
  score: number
  stageCount: number
  familyCount: number
  recentStageCount: number
  recentFamilyCount: number
  status: 'CURRENT' | 'LIMITED' | 'HISTORICAL' | 'INSUFFICIENT'
  branches: TrainingBranch[]
  sources: RecommendationSource[]
}

export interface RecommendationResult {
  generatedAt: string
  algorithmVersion: number
  operationCount: number
  familyCount: number
  invalidCount: number
  categories: string[]
  activities: string[]
  stages: { id: string; name: string }[]
  recommendations: OperatorRecommendation[]
}

export function recommendationParams(search: URLSearchParams): RecommendationParams {
  const scope = search.get('scope')
  const days = Number(search.get('days') ?? (scope === 'HISTORY' ? 0 : 180))
  const coverage = Number(search.get('coverage') ?? 0.8)
  return {
    scope: scope === 'PERMANENT' || scope === 'HISTORY' ? scope : 'RECENT',
    days: (scope === 'HISTORY' ? [0, 90, 180, 365] : [90, 180, 365]).includes(days) ? days : 180,
    coverage: [0.6, 0.8, 0.9].includes(coverage) ? coverage : 0.8,
    stageId: search.get('stageId')?.slice(0, 200) || undefined,
    category: search.get('category')?.slice(0, 200) || undefined,
    activity: search.get('activity')?.slice(0, 200) || undefined,
    includeClosed: search.get('closed') === '1',
    includeAlternatives: search.get('alternatives') !== '0',
    includeUncertain: search.get('uncertain') === '1',
  }
}
