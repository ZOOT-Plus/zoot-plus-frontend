import { Classes, H6, Icon, IconName, MenuItem, MenuItemProps } from '@blueprintjs/core'
import { SelectProps } from '@blueprintjs/select'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { FCC } from '../../../types'

import { Select } from '../../Select'

export type DetailedSelectItem = DetailedSelectHeader | DetailedSelectChoice

export type DetailedSelectHeader = {
  type: 'header'
  key: string
  header: ReactNode | (() => ReactNode)
}

export interface DetailedSelectChoice {
  type: 'choice'
  icon?: IconName
  title: ReactNode | (() => ReactNode)
  value: string | number
  description?: ReactNode | (() => ReactNode)
  disabled?: boolean
  menuItemProps?: Partial<MenuItemProps>
}

export const DetailedSelect: FCC<
  Omit<SelectProps<DetailedSelectItem>, 'itemRenderer' | 'onItemSelect' | 'itemDisabled'> & {
    value?: string | number
    onItemSelect: (item: DetailedSelectChoice) => void
  }
> = ({ className, items, value, onItemSelect, children, ...props }) => (
  <Select
    className={clsx('inline-flex', className)}
    items={items}
    filterable={false}
    resetOnQuery={false}
    itemDisabled={(item) => item.type === 'header' || !!item.disabled}
    itemRenderer={(item, { handleClick, handleFocus, modifiers }) => {
      if (item.type === 'header') {
        return (
          <li key={`header_${item.key}`} className={Classes.MENU_HEADER}>
            <H6>{typeof item.header === 'function' ? item.header() : item.header}</H6>
          </li>
        )
      }

      return (
        <MenuItem
          className={modifiers.active ? Classes.ACTIVE : undefined}
          selected={item.value === value}
          key={item.value}
          onClick={handleClick}
          onFocus={handleFocus}
          multiline
          disabled={item.disabled}
          text={
            <div className="flex items-start">
              {item.icon && <Icon icon={item.icon} className="pt-0.5 mr-2" />}
              <div className="flex flex-col">
                <div className="flex-1">{typeof item.title === 'function' ? item.title() : item.title}</div>
                {item.description && (
                  <div className="text-xs opacity-75">
                    {typeof item.description === 'function' ? item.description() : item.description}
                  </div>
                )}
              </div>
            </div>
          }
          {...item.menuItemProps}
        />
      )
    }}
    onItemSelect={(item) => {
      if (item.type === 'choice') onItemSelect(item)
    }}
    {...props}
  >
    {children}
  </Select>
)

export function isDetailedChoice(item: DetailedSelectItem): item is DetailedSelectChoice {
  return item.type === 'choice'
}
