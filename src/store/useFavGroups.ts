import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { isEqual, omit } from 'lodash-es'

import { CopilotDocV1 } from '../models/copilot.schema'

export const ignoreKeyDic = ['_id', 'id'] as const
type Group = CopilotDocV1.Group
export type FavGroup = Omit<Group, (typeof ignoreKeyDic)[number]>

const FAV_GROUP_STORAGE_KEY = 'zoot-plus-fav-groups'

const favGroupCoreAtom = atomWithStorage<FavGroup[]>(FAV_GROUP_STORAGE_KEY, [], undefined, {
  getOnInit: true,
})

function readLatestFavGroups(memoryValue: FavGroup[]): FavGroup[] {
  try {
    const raw = localStorage.getItem(FAV_GROUP_STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return isEqual(parsed, memoryValue) ? memoryValue : (parsed as FavGroup[])
      }
    }
  } catch {
    // ignore invalid storage state
  }
  return memoryValue
}

export const favGroupAtom = atom(
  (get) => get(favGroupCoreAtom),
  (get, set, update: Group[] | ((prev: FavGroup[]) => Group[])) => {
    const favGroups = typeof update === 'function' ? update(readLatestFavGroups(get(favGroupCoreAtom))) : update
    set(
      favGroupCoreAtom,
      favGroups.map((item) => ({
        ...omit(item, ...ignoreKeyDic),
        ...(item.opers ? { opers: item.opers.map((op) => omit(op, ...ignoreKeyDic)) } : {}),
      })),
    )
  },
)
