import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { omit } from 'lodash-es'

import { CopilotDocV1 } from '../models/copilot.schema'

export const ignoreKeyDic = ['_id', 'id'] as const
type Group = CopilotDocV1.Group
export type FavGroup = Omit<Group, (typeof ignoreKeyDic)[number]>

const favGroupCoreAtom = atomWithStorage<FavGroup[]>('zoot-plus-fav-groups', [])

export const favGroupAtom = atom(
  (get) => get(favGroupCoreAtom),
  (_get, set, favGroups: Group[]) => {
    set(
      favGroupCoreAtom,
      favGroups.map((item) => omit(item, ...ignoreKeyDic)),
    )
  },
)
