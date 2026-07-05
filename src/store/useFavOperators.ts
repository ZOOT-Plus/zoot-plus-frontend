import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { omit } from 'lodash-es'

import { CopilotDocV1 } from '../models/copilot.schema'

type Operator = CopilotDocV1.Operator
export type FavOperator = Omit<Operator, (typeof operatorIgnoreKeyDic)[number]>

export const operatorIgnoreKeyDic = ['id', '_id'] as const

const favOperatorCoreAtom = atomWithStorage<FavOperator[]>('maa-copilot-fav-operator', [])

export const favOperatorAtom = atom(
  (get) => get(favOperatorCoreAtom),
  (_get, set, favOperators: Operator[]) => {
    set(favOperatorCoreAtom, favOperators.map((item) => omit(item, [...operatorIgnoreKeyDic])) as FavOperator[])
  },
)
