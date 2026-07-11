import { atomWithStorage } from 'jotai/utils'

export interface OperatorFilterData {
  included: string[]
  excluded: string[]
  enabled: boolean
  save: boolean
}

export const DEFAULT_OPERATOR_FILTER: OperatorFilterData = {
  included: [],
  excluded: [],
  enabled: true,
  save: true,
}

export const operatorFilterAtom = atomWithStorage<OperatorFilterData>(
  'zoot-plus-operatorFilter',
  DEFAULT_OPERATOR_FILTER,
  undefined,
  { getOnInit: true },
)

// 删除旧版数据
if (localStorage.getItem('zoot-plus-selectedOperators')) {
  localStorage.removeItem('zoot-plus-selectedOperators')
  localStorage.removeItem('zoot-plus-saveSelectedOperators')
}
