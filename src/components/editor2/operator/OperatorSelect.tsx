import { Classes, Icon, MenuDivider, MenuItem } from '@blueprintjs/core'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { atom, useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { FC, ReactNode, memo, useMemo, useState } from 'react'

import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { OPERATORS, getLocalizedOperatorName } from '../../../models/operator'
import { useDebouncedQuery } from '../../../utils/useDebouncedQuery'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { editorAtoms } from '../editor-state'

const operatorNamesAtom = selectAtom(
  editorAtoms.operators,
  (operators) => operators.map((op) => op.name),
  (a, b) => a.join() === b.join(),
)
const groupNamesAtom = selectAtom(
  editorAtoms.groups,
  (groups) => groups.map((g) => g.name),
  (a, b) => a.join() === b.join(),
)
const groupedOperatorNamesAtom = selectAtom(
  editorAtoms.groups,
  (groups) => groups.flatMap((g) => g.opers).map((op) => op.name),
  (a, b) => a.join() === b.join(),
)
// 不需要某个 atom 时用来占位，避免不必要的渲染
const dummyArrayAtom = atom<string[]>([])

interface OperatorSelectProps {
  className?: string
  liftPicked?: boolean
  markPicked?: boolean
  value?: string
  onSelect?: (value: string) => void
  children: ReactNode
}

export const OperatorSelect: FC<OperatorSelectProps> = memo(
  ({ className, liftPicked, markPicked, value, onSelect, children }) => {
    const language = useAtomValue(languageAtom)
    const t = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const operatorNames = useAtomValue(isOpen ? operatorNamesAtom : dummyArrayAtom)
    const groupNames = useAtomValue(isOpen && liftPicked ? groupNamesAtom : dummyArrayAtom)
    const groupedOperatorNames = useAtomValue(isOpen && markPicked ? groupedOperatorNamesAtom : dummyArrayAtom)
    const overallOperatorNames = [...operatorNames, ...groupedOperatorNames]

    const isGroup = (name?: string) => name !== undefined && groupNames.includes(name)

    type Item = {
      key: string
      isHeader?: boolean
      operatorId?: string
      name?: string
      value?: string
    }
    const items: Item[] = useMemo(() => {
      if (!isOpen) return []
      if (!liftPicked)
        return OPERATORS.map((op) => ({
          key: op.id,
          operatorId: op.id,
          name: getLocalizedOperatorName(op.name, language),
          value: op.name,
        }))

      // 把已选择的干员和干员组放在前面
      const pickedOperators = operatorNames.map((name) => ({
        key: name,
        name: getLocalizedOperatorName(name, language),
        value: name,
      }))

      const unpickedOperators = (
        pickedOperators.length ? OPERATORS.filter((op) => !operatorNames.includes(op.name)) : OPERATORS
      ).map((op) => ({
        key: op.id,
        operatorId: op.id,
        name: getLocalizedOperatorName(op.name, language),
        value: op.name,
      }))

      const items: Item[] = [
        ...groupNames.map((name, index) => ({
          key: name + index,
          name,
          value: name,
        })),
        ...pickedOperators,
      ]

      if (items.length > 0) {
        items.push({ key: '__header__', isHeader: true })
      }
      items.push(...unpickedOperators)
      return items
    }, [operatorNames, groupNames, isOpen, language, liftPicked])

    const fuse = useMemo(
      () =>
        new Fuse(items, {
          keys: ['name', 'alias', 'alt_name'],
          threshold: 0.3,
        }),
      [items],
    )

    const { query, trimmedDebouncedQuery, updateQuery, onOptionMouseDown } = useDebouncedQuery()

    const filteredItems = useMemo(
      () => (trimmedDebouncedQuery ? fuse.search(trimmedDebouncedQuery).map((el) => el.item) : items),
      [items, fuse, trimmedDebouncedQuery],
    )

    return (
      <Select<Item>
        query={query}
        className={clsx('inline', className)}
        onQueryChange={(query) => updateQuery(query, false)}
        items={items}
        itemDisabled={(item) => !!item.isHeader}
        itemRenderer={(item, { handleClick, handleFocus, modifiers }) =>
          item.isHeader ? (
            <MenuDivider key={item.key} />
          ) : (
            <MenuItem
              roleStructure="listoption"
              className={clsx('py-0 items-center', modifiers.active && Classes.ACTIVE)}
              key={item.key}
              text={
                <div className="flex items-center gap-2">
                  {isGroup(item.name) ? (
                    <OperatorAvatar
                      className="w-8 h-8 leading-3"
                      fallback={<Icon icon="people" size={20} className="align-middle" />}
                    />
                  ) : (
                    <OperatorAvatar
                      className="w-8 h-8 leading-3"
                      id={item.operatorId}
                      name={item.value}
                      fallback={item.name}
                    />
                  )}
                  {item.name}
                </div>
              }
              onClick={handleClick}
              onFocus={handleFocus}
              onMouseDown={onOptionMouseDown}
              selected={
                value === item.value || (markPicked && !!item.value && overallOperatorNames.includes(item.value))
              }
              labelElement={
                markPicked && item.value && overallOperatorNames.includes(item.value) ? <Icon icon="tick" /> : undefined
              }
              disabled={modifiers.disabled}
            />
          )
        }
        itemListPredicate={() => filteredItems}
        createNewItemFromQuery={(query) => createArbitraryOperator(query)}
        createNewItemRenderer={(query, active, handleClick) => (
          <MenuItem
            key="create-new-item"
            roleStructure="listoption"
            text={t.components.editor2.OperatorSelect.use_custom_name({
              name: query,
            })}
            className={clsx('py-0 items-center', active && Classes.ACTIVE)}
            icon="text-highlight"
            onClick={handleClick}
          />
        )}
        inputProps={{
          placeholder: t.components.editor2.OperatorSelect.search_operator,
        }}
        resetOnSelect={true}
        popoverProps={{
          placement: 'right-start',
          onOpening: () => setIsOpen(true),
          onClosed: () => setIsOpen(false),
        }}
        onItemSelect={(item) => {
          if (item.value) {
            onSelect?.(item.value)
          }
        }}
      >
        {children}
      </Select>
    )
  },
)
OperatorSelect.displayName = 'OperatorSelect'

const createArbitraryOperator = (name: string) => ({
  id: '',
  name,
  name_en: '',
  alias: '',
  alt_name: '',
  subProf: '',
  prof: '',
  rarity: 0,
  key: '',
  value: name,
})
