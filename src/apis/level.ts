import useSWR, { mutate } from 'swr'

import { LevelApi } from 'utils/zoot-plus-client'

import { Level } from 'models/operation'

import { getLastLevelsUpdateBoundary, isLevelsCacheStale } from './level-staleness'

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

// 逐条校验缓存的关卡对象。消费方会对这些字段调用字符串/数值方法（localeCompare、includes、
// 坐标比较等），损坏条目一旦通过校验且被判新鲜就永不重新请求，缓存会持续投毒直到版本号
// 升级或用户手动清存储——因此校验失败必须整体作废缓存，走重新请求并覆写的自愈路径
function isValidLevelsData(data: unknown): data is Level[] {
  const isLevel = (level: unknown): level is Level =>
    typeof level === 'object' &&
    level !== null &&
    typeof (level as Level).levelId === 'string' &&
    typeof (level as Level).stageId === 'string' &&
    typeof (level as Level).catOne === 'string' &&
    typeof (level as Level).catTwo === 'string' &&
    typeof (level as Level).catThree === 'string' &&
    typeof (level as Level).name === 'string' &&
    typeof (level as Level).width === 'number' &&
    typeof (level as Level).height === 'number'

  return Array.isArray(data) && data.every(isLevel)
}

function readLevelsCache(): LevelsCache | null {
  try {
    const cache: unknown = JSON.parse(localStorage.getItem(LEVELS_CACHE_KEY) ?? 'null')

    if (
      typeof cache === 'object' &&
      cache !== null &&
      (cache as LevelsCache).v === LEVELS_CACHE_VERSION &&
      typeof (cache as LevelsCache).cachedAt === 'number' &&
      isValidLevelsData((cache as LevelsCache).data)
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

// revalidateIfStale 在每次 hook 渲染时都会用当前时间重新判定，跨过 04:00 更新点后的
// 重新挂载/路由访问会正常刷新；但一直挂载且期间零重挂载的组件没有重判定的机会，
// 用一次性定时器在下一个更新点兜底触发刷新（全局 mutate 不受 dedupingInterval 限制）
const msToNextUpdateBoundary = getLastLevelsUpdateBoundary() + ONE_DAY - Date.now()
setTimeout(() => void mutate('levels'), msToNextUpdateBoundary)

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
