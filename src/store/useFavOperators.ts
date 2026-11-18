import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { isEqual, omit } from 'lodash-es'

import { CopilotDocV1 } from '../models/copilot.schema'

type Operator = CopilotDocV1.Operator
export type FavOperator = Omit<Operator, (typeof operatorIgnoreKeyDic)[number]>

export const operatorIgnoreKeyDic = ['id', '_id'] as const

const FAV_OPERATOR_STORAGE_KEY = 'zoot-plus-fav-operator'

const favOperatorCoreAtom = atomWithStorage<FavOperator[]>(FAV_OPERATOR_STORAGE_KEY, [], undefined, {
  getOnInit: true,
})

function readLatestFavOperators(memoryValue: FavOperator[]): FavOperator[] {
  try {
    const raw = localStorage.getItem(FAV_OPERATOR_STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return isEqual(parsed, memoryValue) ? memoryValue : (parsed as FavOperator[])
      }
    }
  } catch {
    // ignore invalid storage state
  }
  return memoryValue
}

export const favOperatorAtom = atom(
  (get) => get(favOperatorCoreAtom),
  (get, set, update: Operator[] | ((prev: FavOperator[]) => Operator[])) => {
    const favOperators =
      typeof update === 'function' ? update(readLatestFavOperators(get(favOperatorCoreAtom))) : update
    set(favOperatorCoreAtom, favOperators.map((item) => omit(item, [...operatorIgnoreKeyDic])) as FavOperator[])
  },
)
