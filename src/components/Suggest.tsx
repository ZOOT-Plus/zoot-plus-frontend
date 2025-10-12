import { Suggest2, Suggest2Props } from '@blueprintjs/select'

import { noop } from 'lodash-es'
import { useEffect, useRef } from 'react'
import { ControllerFieldState } from 'react-hook-form'

import {
  UseDebouncedQueryParams,
  useDebouncedQuery,
} from '../utils/useDebouncedQuery'
import { FieldResetButton } from './FieldResetButton'

interface SuggestProps<T>
  extends Omit<Suggest2Props<T>, 'onQueryChange'>,
    UseDebouncedQueryParams {
  query?: string // controlled query, optional
  fieldState?: ControllerFieldState
  onReset?: () => void
}

export const Suggest = <T,>({
  debounceTime = 100,
  fieldState,
  query: externalQuery,
  onQueryChange,
  onDebouncedQueryChange,
  onReset,

  itemListPredicate,
  selectedItem,
  inputProps,
  ...suggest2Props
}: SuggestProps<T>) => {
  // 禁用掉 focus 自动选中输入框文字的功能
  // https://github.com/palantir/blueprint/blob/b41f668461e63e2c20caf54a3248181fe01161c4/packages/select/src/components/suggest/suggest2.tsx#L229
  const ref = useRef<Suggest2<T>>(null)
  if (ref.current && ref.current['selectText'] !== noop) {
    ref.current['selectText'] = noop
  }

  const { query, debouncedQuery, updateQuery } = useDebouncedQuery({
    query: externalQuery,
    debounceTime,
    onQueryChange,
    onDebouncedQueryChange,
  })

  useEffect(() => {
    if (fieldState && !fieldState.isTouched) {
      updateQuery('', true)
    }
  }, [fieldState, updateQuery])

  // 合并 Popover2 属性：强制 Portal 并提升层级，避免在 Dialog 内被遮挡
  const basePopover = (suggest2Props as any)?.popoverProps || {}
  const mergedPopover = {
    ...basePopover,
    usePortal: true,
    portalClassName: [basePopover.portalClassName, 'z-[3100]'].filter(Boolean).join(' '),
  }

  return (
    <Suggest2<T>
      ref={ref}
      query={query}
      onQueryChange={(query) => updateQuery(query, false)}
      selectedItem={selectedItem}
      itemListPredicate={
        itemListPredicate
          ? (query, items) => itemListPredicate(debouncedQuery, items)
          : undefined
      }
      inputProps={{
        onKeyDown: (event) => {
          // prevent form submission
          if (event.key === 'Enter') {
            event.preventDefault()
          }
        },
        rightElement: (
          <FieldResetButton
            disabled={
              !(
                // enabled =
                (fieldState
                  ? fieldState.isDirty
                  : onReset
                    ? query || selectedItem !== null
                    : false)
              )
            }
            onReset={() => {
              updateQuery('', true)
              onReset?.()
            }}
          />
        ),
        ...inputProps,
      }}
      {...suggest2Props}
      popoverProps={{
        placement: 'bottom-start',
        captureDismiss: true,
        ...mergedPopover,
      }}
    />
  )
}
