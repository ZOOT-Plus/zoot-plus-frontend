import { Button, ButtonProps, Classes, Label } from '@blueprintjs/core'
import { Classes as Popover2Classes } from '@blueprintjs/popover2'
import {
  QueryList,
  Select2,
  Select2Props,
  isCreateNewItem,
} from '@blueprintjs/select'

import clsx from 'clsx'

interface SelectProps<T> extends Select2Props<T> {
  selectedItem?: T
  resetButtonProps?: ButtonProps
  canReset?: boolean
  onReset?: () => void
}

export const Select = <T,>({
  className,
  selectedItem,
  canReset,
  onReset,
  resetButtonProps,
  inputProps,
  ...props
}: SelectProps<T>) => {
  canReset ??= selectedItem !== undefined

  // 合并 Popover2 属性：强制使用 Portal 并提升层级，避免在 Dialog 内被遮挡
  const mergedPopoverProps = {
    ...(props as any).popoverProps,
    usePortal: true,
    portalClassName: clsx('z-[3100]', (props as any).popoverProps?.portalClassName),
  }

  return (
    <Label className={clsx('!inline-flex items-center !mb-0', className)}>
      <Select2
        ref={patchHandleItemSelect}
        className="!mt-0"
        resetOnQuery={false} // 这个功能有无限 reset 的 bug，不要用
        inputProps={{
          ...inputProps,
          className: clsx(
            '[&_.bp4-input]:rounded-md [&_.bp4-icon-search]:!m-[7px] [&_.bp4-button]:!p-[0_7px]',
            inputProps?.className,
          ),
        }}
        {...props}
        popoverProps={mergedPopoverProps}
      />
      {canReset && (
        <Button
          small
          minimal
          icon="cross"
          {...resetButtonProps}
          onClick={(e) => {
            // 因为在 Label 内，不阻止的话会再次展开 Select
            e.preventDefault()

            onReset?.()
          }}
        />
      )}
    </Label>
  )
}

// 临时实现 PR 里的内容： https://github.com/palantir/blueprint/pull/6070
// TODO: 升级到 BP 5 后删除
function patchHandleItemSelect(instance: Select2<any> | null) {
  if (!instance || instance['handleItemSelect']._patched) return
  instance['handleItemSelect'] = (
    item: unknown,
    event?: React.SyntheticEvent<HTMLElement>,
  ) => {
    const target = event?.target as HTMLElement
    const shouldDismiss =
      target
        ?.closest(`.${Classes.MENU_ITEM}`)
        ?.classList?.contains(Popover2Classes.POPOVER2_DISMISS) ?? true

    instance.setState({ isOpen: !shouldDismiss })
    instance.props.onItemSelect?.(item, event)
  }
  instance['handleItemSelect']._patched = true
}
//

// 修复 BP 的远古 bug：https://github.com/palantir/blueprint/issues/3751

const originalSetQuery =
  (QueryList.prototype.setQuery as any)._original ??
  QueryList.prototype.setQuery
QueryList.prototype.setQuery = function (...args) {
  ;(this as any)._isCallingSetQuery = true
  originalSetQuery.apply(this, args)
  ;(this as any)._isCallingSetQuery = false
}
;(QueryList.prototype.setQuery as any)._original = originalSetQuery

const originalGetActiveIndex =
  (QueryList.prototype['getActiveIndex'] as any)._original ??
  QueryList.prototype['getActiveIndex']
QueryList.prototype['getActiveIndex'] = function (items) {
  if ((this as any)._isCallingSetQuery) {
    const activeItem =
      this.props.activeItem === undefined
        ? this.state.activeItem
        : this.props.activeItem

    if (isCreateNewItem(activeItem)) {
      // bug 1：如果 activeItem 是 createNewItem，QueryList 会直接将 activeItem 刷新为第一个 item，
      // 为了阻止这种行为，这里返回 0 以绕过 activeIndex < 0 的判断：https://github.com/palantir/blueprint/blob/e365c08b2f133ad102de8cdf687b9609e824d96c/packages/select/src/components/query-list/queryList.tsx#L328
      return 0
    }

    return originalGetActiveIndex.call(
      {
        props: this.props,
        state: {
          ...this.state,

          // bug 2：QueryList 在 setState({ activeItem: props.activeItem }) 之后并未等待 state 更新就直接读取 state.activeItem，
          // 导致 activeItem 仍然是旧值，所以这里直接使用 props.activeItem 来覆盖
          activeItem,
        },
      },
      items,
    )
  }
  return originalGetActiveIndex.call(this, items)
}
;(QueryList.prototype['getActiveIndex'] as any)._original =
  originalGetActiveIndex
