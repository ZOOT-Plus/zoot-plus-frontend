import { Classes, MenuItem } from '@blueprintjs/core'
import { MenuItem2 } from '@blueprintjs/popover2'
import { MultiSelect2 } from '@blueprintjs/select'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { useAtomValue } from 'jotai'
import { compact } from 'lodash-es'
import { FC, useMemo } from 'react'

import { languageAtom, useTranslation } from '../i18n/i18n'
import { OPERATORS } from '../models/operator'
import { useDebouncedQuery } from '../utils/useDebouncedQuery'
import { OperatorAvatar } from './OperatorAvatar'

interface OperatorSelectProps {
  className?: string
  operators: string[]
  onChange: (operators: string[]) => void
}

type OperatorInfo = (typeof OPERATORS)[number]

export const OperatorSelect: FC<OperatorSelectProps> = ({
  className,
  operators,
  onChange,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const { query, trimmedDebouncedQuery, updateQuery, onOptionMouseDown } =
    useDebouncedQuery()

  const fuse = useMemo(
    () =>
      new Fuse(OPERATORS, {
        keys: ['name', 'name_en', 'alias', 'alt_name'],
        threshold: 0.3,
      }),
    [],
  )

  const selectedItems = useMemo(
    () =>
      compact(
        operators.map((name) => OPERATORS.find((item) => item.name === name)),
      ),
    [operators],
  )

  const select = (operator: OperatorInfo) => {
    if (!operators.includes(operator.name)) {
      onChange([...operators, operator.name])
    }
  }

  const remove = (operator: OperatorInfo) => {
    onChange(operators.filter((name) => name !== operator.name))
  }

  const clear = () => {
    onChange([])
  }

  return (
    <MultiSelect2<OperatorInfo>
      className={clsx('', className)}
      query={query}
      onQueryChange={(query) => updateQuery(query, false)}
      items={OPERATORS}
      itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
        <MenuItem2
          roleStructure="listoption"
          className={clsx(
            'py-0 items-center',
            modifiers.active && Classes.ACTIVE,
            selectedItems.includes(item) && Classes.SELECTED,
          )}
          key={item.id}
          text={
            <div className="flex items-center gap-2">
              <OperatorAvatar
                className="w-8 h-8"
                id={item.id}
                rarity={item.rarity}
              />
              {language === 'zh_tw' ? item.name_en : item.name}
            </div>
          }
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseDown={onOptionMouseDown}
          selected={selectedItems.includes(item)}
          disabled={modifiers.disabled}
        />
      )}
      itemListPredicate={() => {
        // 如果没有输入则不显示下拉框，配合空的 noResults 来实现（不能使用 initialContent，因为它检查的是 query 而不是 debouncedQuery）
        if (!trimmedDebouncedQuery) {
          return []
        }
        return fuse.search(trimmedDebouncedQuery).map((el) => el.item)
      }}
      selectedItems={selectedItems}
      placeholder=""
      noResults={
        trimmedDebouncedQuery ? (
          <MenuItem
            roleStructure="listoption"
            disabled
            text={t.components.OperatorSelect.no_matching_operators}
          />
        ) : undefined
      }
      tagInputProps={{
        className: '!flex !p-0 !pl-[5px]',
        large: true,
        tagProps: {
          minimal: true,
          className: '!py-0 !pl-0',
        },
        inputProps: {
          className: '!leading-8',
        },
      }}
      resetOnSelect={true}
      tagRenderer={(item) => (
        <div className="flex items-center gap-2">
          <OperatorAvatar
            className="w-8 h-8"
            id={item.id}
            rarity={item.rarity}
          />
          {language === 'zh_tw' ? item.name_en : item.name}
        </div>
      )}
      popoverProps={{
        popoverClassName: trimmedDebouncedQuery
          ? undefined
          : '[&_.bp4-popover2-content]:!p-0',
        placement: 'bottom-start',
        minimal: true,
        matchTargetWidth: true,
      }}
      onItemSelect={select}
      onRemove={remove}
      onClear={clear}
    />
  )
}
