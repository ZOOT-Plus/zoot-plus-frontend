import useSWR from 'swr'

import { LevelApi } from 'utils/zoot-plus-client'

import { Level } from 'models/operation'

import { isLevelsCacheStale } from './level-staleness'

const ONE_DAY = 1000 * 60 * 60 * 24
const emptyArray = []

// 关卡数据体积较大（约 550KB）且只随游戏版本变化，持久化到 localStorage 后，
// 回访用户在缓存未过期时可以零网络请求直接渲染（过期规则见 level-staleness.ts）
const LEVELS_CACHE_KEY = 'zoot-plus-levels'
const LEVELS_CACHE_VERSION = 1

interface LevelsCache {
  v: number
  cachedAt: number
  data: Level[]
}

function readLevelsCache(): LevelsCache | null {
  try {
    const cache: unknown = JSON.parse(localStorage.getItem(LEVELS_CACHE_KEY) ?? 'null')

    if (
      typeof cache === 'object' &&
      cache !== null &&
      (cache as LevelsCache).v === LEVELS_CACHE_VERSION &&
      typeof (cache as LevelsCache).cachedAt === 'number' &&
      Array.isArray((cache as LevelsCache).data)
    ) {
      return cache as LevelsCache
    }
  } catch {
    // 缓存损坏（如写入被中断）时按无缓存处理，静默降级为重新请求
  }

  return null
}

function writeLevelsCache(levels: Level[]) {
  try {
    localStorage.setItem(
      LEVELS_CACHE_KEY,
      JSON.stringify({ v: LEVELS_CACHE_VERSION, cachedAt: Date.now(), data: levels } satisfies LevelsCache),
    )
  } catch (e) {
    // 容量超限或隐私模式写入失败只影响下次访问的缓存命中率，不影响本次数据返回
    console.warn('failed to write levels cache to localStorage', e)
  }
}

// 模块加载时读取一次，引用稳定地作为 SWR 的 fallbackData
const cachedLevels = readLevelsCache()

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

      const filtered = levels.filter((level) => {
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

      writeLevelsCache(filtered)

      return filtered
    },
    {
      fallbackData: cachedLevels?.data ?? emptyArray,
      // 缓存新鲜（未跨过北京时间 04:00 更新点）时跳过请求；无缓存或已过期时按 stale-while-revalidate
      // 处理：先渲染 fallbackData 再后台刷新。SWR 在有 fallbackData 且此选项为 false 时不发请求
      // （swr 2.5 的 shouldDoInitialRevalidation 逻辑）
      revalidateIfStale: !cachedLevels || isLevelsCacheStale(cachedLevels.cachedAt),
      focusThrottleInterval: ONE_DAY,
      dedupingInterval: ONE_DAY,
      suspense,
    },
  )
}
