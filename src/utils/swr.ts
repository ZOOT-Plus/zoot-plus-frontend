import { useSWRConfig } from 'swr'

const STORAGE_KEY = 'zoot-plus-swr'

// 清理旧版本留下的缓存数据
// TODO: 等大部分用户都升级到新版本，就删除这个函数，大概在三个月之后？
export function clearOutdatedSwrCache() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Compared with bare mutate(), this hook has an additional support for
 * refreshing the data of useSWRInfinite(), but may cause unwanted
 * revalidation of other keys if not used carefully.
 * @see https://github.com/vercel/swr/issues/1670#issuecomment-1625977770
 */
export function useSWRRefresh() {
  const { mutate, cache } = useSWRConfig()

  return (keyMatcher: (key: string) => boolean) => {
    for (const key of cache.keys()) {
      if (keyMatcher(key)) {
        mutate(key)
      }
    }
  }
}

/**
 * Deletes matching cache entries. When a component needs to use these cache keys again,
 * it will re-fetch the data from the server.
 *
 * Difference from useSWRRefresh:
 * - `useSWRRefresh`'s `mutate(key)` can only refresh components that are currently visible on the page.
 *   If a component has been unmounted (e.g., navigating away from a profile page, closing a list page),
 *   `mutate(key)` will fail because it cannot find the corresponding fetcher function,
 *   leaving stale data in the cache.
 * - `useSWRClear` directly deletes the cache entries. This way, even if a component has been unmounted,
 *   when you return to that page next time, it will re-fetch the data because there's nothing in the cache,
 *   ensuring you get the latest content.
 */
export function useSWRClear() {
  const { cache, mutate } = useSWRConfig()

  return (keyMatcher: (key: string) => boolean) => {
    for (const key of [...cache.keys()]) {
      if (keyMatcher(key)) {
        cache.delete(key)
        mutate(key)
      }
    }
  }
}
