import { Draft } from 'immer'
import { PrimitiveAtom } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { useCallback } from 'react'

export type OnChangeImmer<T> = (value: T | ((draft: Draft<T>) => void)) => void

interface RenderProps<T> {
  onChange: OnChangeImmer<T>
}

interface AtomRendererProps<T> {
  atom: PrimitiveAtom<T>
  render: (value: T, props: RenderProps<T>) => JSX.Element
}

export const AtomRenderer = <T,>({ atom, render }: AtomRendererProps<T>) => {
  const [value, setValue] = useImmerAtom(atom)
  const onChange: OnChangeImmer<T> = useCallback(
    (value) => {
      if (typeof value === 'function') {
        setValue(value as (draft: Draft<T>) => void)
      } else {
        setValue(() => value)
      }
    },
    [setValue],
  )
  return render(value, { onChange })
}
