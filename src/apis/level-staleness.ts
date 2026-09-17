// 关卡数据的过期判定逻辑。
//
// 上游关卡数据只可能在北京时间每天 04:00 更新（当天的更新可能跳过，但不会发生在其他时间），
// 因此 localStorage 缓存只需在跨过该时间点后视为过期，其余时间可直接使用、无需重新请求。

const BEIJING_TZ_OFFSET_MS = 8 * 60 * 60 * 1000
const LEVELS_UPDATE_HOUR_BEIJING = 4
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * 最近一个「关卡数据可能已更新」的时刻：北京时间今天 04:00；
 * 若当前尚未到今天 04:00，则为昨天 04:00。
 */
export function getLastLevelsUpdateBoundary(now = Date.now()) {
  // 北京时间无夏令时，固定 UTC+8：把时刻平移到北京钟面后，用 UTC 方法取日期部分
  const beijingNow = new Date(now + BEIJING_TZ_OFFSET_MS)
  let boundary =
    Date.UTC(
      beijingNow.getUTCFullYear(),
      beijingNow.getUTCMonth(),
      beijingNow.getUTCDate(),
      LEVELS_UPDATE_HOUR_BEIJING,
    ) - BEIJING_TZ_OFFSET_MS

  if (boundary > now) {
    boundary -= ONE_DAY_MS
  }

  return boundary
}

/** 缓存写入时间早于最近一个更新点即视为过期（期间数据可能已被更新） */
export function isLevelsCacheStale(cachedAt: number, now = Date.now()) {
  return cachedAt < getLastLevelsUpdateBoundary(now)
}
