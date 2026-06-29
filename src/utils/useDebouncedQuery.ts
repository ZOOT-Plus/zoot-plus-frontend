import { debounce } from 'lodash-es'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useEffectEvent } from './react'

export interface UseDebouncedQueryParams {
  query?: string
  /** @default 50(ms) */
  debounceTime?: number
  onQueryChange?: (query: string) => void
  onDebouncedQueryChange?: (query: string) => void
}

/**
 * 适用于带有搜索功能的输入框，比如 Select、Suggest、MultiSelect，用于性能优化，
 * 以及修复使用输入法时的 bug：https://github.com/ZOOT-Plus/zoot-plus-frontend/issues/72
 * 传入 query 时为受控模式，否则为非受控模式
 */
export function useDebouncedQuery({
  debounceTime = 50,
  query: externalQuery,
  onQueryChange,
  onDebouncedQueryChange,
}: UseDebouncedQueryParams = {}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const handleQueryChange = useEffectEvent((newQuery: string) => {
    if (
      // 如果有传入的 query，则使用传入的 query 来比较
      externalQuery !== undefined ? externalQuery !== newQuery : query !== newQuery
    ) {
      onQueryChange?.(newQuery)
    }
  })
  const handleDebouncedQueryChange = useEffectEvent((newQuery: string) => {
    if (newQuery !== debouncedQuery) {
      onDebouncedQueryChange?.(newQuery)
    }
  })

  const updateQuery = useMemo(() => {
    const debouncedUpdateQuery = debounce((query: string) => {
      setDebouncedQuery(query)
      handleDebouncedQueryChange(query)
    }, debounceTime)

    const updateQuery = (query: string, immediately: boolean) => {
      setQuery(query)
      handleQueryChange(query)
      debouncedUpdateQuery(query)
      if (immediately) {
        debouncedUpdateQuery.flush()
      }
    }
    updateQuery.flush = debouncedUpdateQuery.flush
    updateQuery.cancel = debouncedUpdateQuery.cancel
    return updateQuery
  }, [debounceTime])

  // 立即更新防止后续冲突
  useEffect(() => () => updateQuery.flush(), [updateQuery])

  // 作为受控组件时，外部 query 变化时更新内部 query 和 debouncedQuery
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== query) {
      updateQuery(externalQuery, false)
    }
  }, [externalQuery, query, updateQuery])

  // 修复输入法的 bug：点击选项时，已经输入的拼音会立即清空，导致 query 更新，点中的选项错位。
  // 此时 debouncedQuery 尚未更新，所以可以立刻将 query 还原为原来的值，这样相当于保留已输入的拼音。
  // 目前看来即使 debounceTime=0 也有效，但保险起见还是不要设置得太小
  const onOptionMouseDown = useCallback(() => {
    updateQuery(debouncedQuery, true)
  }, [debouncedQuery, updateQuery])

  return {
    query: externalQuery ?? query,
    debouncedQuery,
    trimmedDebouncedQuery: debouncedQuery.trim(),
    updateQuery,
    onOptionMouseDown,
  }
}
