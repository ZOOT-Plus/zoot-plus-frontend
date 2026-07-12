import useSWR from 'swr'

import { LevelApi } from 'utils/zoot-plus-client'

const ONE_DAY = 1000 * 60 * 60 * 24
const emptyArray = []

export const useLevels = ({ suspense }: { suspense?: boolean } = {}) => {
  return useSWR(
    'levels',
    async () => {
      const res = await new LevelApi({
        sendToken: 'never',
        requireData: true,
      }).getLevels()
      const levels = res.data

      const stageIds = new Set<string>()

      return levels.filter((level) => {
        if (
          // 肉鸽
          level.levelId.includes('roguelike') ||
          // 保全派驻
          level.levelId.includes('legion')
        ) {
          return false
        }

        if (stageIds.has(level.stageId)) {
          return false
        }

        stageIds.add(level.stageId)

        return true
      })
    },
    {
      fallbackData: emptyArray,
      focusThrottleInterval: ONE_DAY,
      dedupingInterval: ONE_DAY,
      suspense,
    },
  )
}
