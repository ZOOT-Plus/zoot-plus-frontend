import { atomWithStorage } from 'jotai/utils'

import { DEFAULT_OPERATOR_MATCH_MODES, OperatorMatchMode, OwnedOperator } from '../models/operatorMatcher'

export interface OperatorMatcherSettings {
  enabled: boolean
  lastChangedAt?: string
  modes: OperatorMatchMode[]
  ownedOperators: OwnedOperator[]
  token: string
}

export const DEFAULT_OPERATOR_MATCHER_SETTINGS: OperatorMatcherSettings = {
  enabled: false,
  modes: [...DEFAULT_OPERATOR_MATCH_MODES],
  ownedOperators: [],
  token: '',
}

export const operatorMatcherSettingsAtom = atomWithStorage<OperatorMatcherSettings>(
  'zoot-plus-operator-matcher',
  DEFAULT_OPERATOR_MATCHER_SETTINGS,
  undefined,
  { getOnInit: true },
)
