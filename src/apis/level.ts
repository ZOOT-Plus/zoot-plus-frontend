import useSWR from 'swr'

const ONE_DAY = 1000 * 60 * 60 * 24
const emptyArray: any[] = []

const API_URL = import.meta.env.VITE_API

async function fetchLevelsV2() {
  const resp = await fetch(`${API_URL}/arknights/level/v2`, {
    headers: { 'content-type': 'application/json' },
  })
  if (!resp.ok) {
    throw new Error(`request failed: ${resp.status}`)
  }
  const body = await resp.json()
  const status = body?.statusCode ?? body?.status_code
  const data = body?.data
  if (status !== 200 || !data) {
    throw new Error(body?.message || 'invalid response')
  }
  // 将后端蛇形命名字段转换为前端使用的驼峰命名
  const mapped = (data as any[]).map((it) => ({
    game: it.game ?? '明日方舟',
    levelId: it.levelId ?? it.level_id ?? '',
    stageId: it.stageId ?? it.stage_id ?? '',
    catOne: it.catOne ?? it.cat_one ?? '',
    catTwo: it.catTwo ?? it.cat_two ?? '',
    catThree: it.catThree ?? it.cat_three ?? '',
    name: it.name ?? '',
    width: it.width ?? 0,
    height: it.height ?? 0,
  }))
  return mapped
}

export const useLevels = ({ suspense }: { suspense?: boolean } = {}) => {
  return useSWR(
    'levels-v2',
    async () => {
      const levels = await fetchLevelsV2()

      const stageIds = new Set<string>()

      return levels.filter((level: any) => {
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
