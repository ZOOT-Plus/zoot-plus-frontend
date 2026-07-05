import { Fragment, ReactNode, useCallback, useInsertionEffect, useRef } from 'react'

export function joinJSX(elements: ReactNode[], separator: ReactNode): ReactNode[] {
  return elements.reduce((acc: ReactNode[], element, index) => {
    if (index === 0) return [element]
    return [...acc, <Fragment key={'sep' + index}>{separator}</Fragment>, element]
  }, [])
}

export function preserveLineBreaks(text: string) {
  return joinJSX(text.split('\n'), <br />)
}

// The useEvent API has not yet been added to React,
// so this is a temporary shim to make this sandbox work.
// You're not expected to write code like this yourself.
// https://stackoverflow.com/a/76514983/13237325
export function useEffectEvent<T extends (...args: any[]) => unknown>(fn: T) {
  const ref = useRef<T>(fn)
  useInsertionEffect(() => {
    ref.current = fn
  }, [fn])
  return useCallback((...args: Parameters<T>) => {
    const f = ref.current
    return f(...args)
  }, [])
}
