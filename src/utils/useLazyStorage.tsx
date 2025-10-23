import { useEffect, useState } from 'react'
import { useLatest } from 'react-use'

/**
 * Persists state in localStorage when the component unmounts or the page is closed.
 *
 * @param storageKey
 * @param defaultValue
 * @param reviver - an optional function to transform the saved value on init.
 */
export function useLazyStorage<T>(
  storageKey: string,
  defaultValue: T,
  reviver?: (savedValue: T | null, defaultValue: T) => T,
) {
  const [value, setValue] = useState<T>(() => {
    let savedValue: T | null = null

    try {
      savedValue = JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch (e) {
      console.warn(e)
    }

    return reviver
      ? reviver(savedValue, defaultValue)
      : (savedValue ?? defaultValue)
  })

  const latestValue = useLatest(value)

  useEffect(() => {
    const onUnload = () =>
      localStorage.setItem(storageKey, JSON.stringify(latestValue.current))

    window.addEventListener('beforeunload', onUnload)

    return () => {
      onUnload()
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [storageKey, latestValue])

  return [value, setValue] as const
}
