import { Classes, Icon, MenuDivider, MenuItem } from '@blueprintjs/core'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { PrimitiveAtom, atom, useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { FC, ReactNode, memo, useMemo, useState } from 'react'

import { isEqual } from 'lodash-es'
import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import {
  OPERATORS,
  OperatorInfo,
  findOperatorsByIdentity,
  getLocalizedOperatorName,
  identityFromInfo,
  matchOperatorIdentity,
} from '../../../models/operator'
import { useDebouncedQuery } from '../../../utils/useDebouncedQuery'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { editorAtoms } from '../editor-state'

const operatorIdentitiesAtom = selectAtom(
  editorAtoms.operators,
  (operators): CopilotDocV1.OperatorIdentity[] => operators.map((op) => ({ name: op.name, role: op.role })),
  (a, b) => isEqual(a, b),
)
const groupNamesAtom = selectAtom(
  editorAtoms.groups,
  (groups) => groups.map((g) => g.name),
  (a, b) => a.join() === b.join(),
)
const groupedOperatorIdentitiesAtom = selectAtom(
  editorAtoms.groups,
  (groups): CopilotDocV1.OperatorIdentity[] =>
    groups.flatMap((g) => g.opers).map((op) => ({ name: op.name, role: op.role })),
  (a, b) => isEqual(a, b),
)
// 不需要某个 atom 时用来占位，避免不必要的渲染
const dummyArrayAtom = atom<CopilotDocV1.OperatorIdentity[]>([])

interface OperatorSelectProps {
  className?: string
  /** 是否在列表的最上方显示可用的干员和干员组 */
  showCandidates?: boolean
  /** 是否标记已选择的干员，包括在干员组中的干员 */
  markPicked?: boolean
  /** operatorId 的优先级高于 value，如果 operatorId 存在，则会忽略 value */
  operatorId?: string
  value?: string
  onSelect?: (value: string, info: { operatorId?: string }) => void
  children: ReactNode
}

export const OperatorSelect: FC<OperatorSelectProps> = memo(
  ({ className, showCandidates, markPicked, operatorId, value, onSelect, children }) => {
    const language = useAtomValue(languageAtom)
    const t = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const operatorIdentities = useAtomValue(isOpen ? operatorIdentitiesAtom : dummyArrayAtom)
    const groupNames = useAtomValue(
      isOpen && showCandidates ? groupNamesAtom : (dummyArrayAtom as unknown as PrimitiveAtom<string[]>),
    )
    const groupedOperatorIdentities = useAtomValue(
      isOpen && markPicked ? groupedOperatorIdentitiesAtom : dummyArrayAtom,
    )

    type Item = {
      key: string
      isHeader?: boolean
      isGroup?: boolean
      operatorId?: string
      name?: string
      value?: string
      picked?: boolean
    }
    const items: Item[] = useMemo(() => {
      if (!isOpen) return []

      const overallOperatorIdentities = [...operatorIdentities, ...groupedOperatorIdentities]
      const isPicked = (info: OperatorInfo) => {
        const identity = identityFromInfo(info)
        return overallOperatorIdentities.some((picked) => matchOperatorIdentity(picked, identity))
      }

      if (!showCandidates)
        return OPERATORS.map((info) => ({
          key: info.id,
          operatorId: info.id,
          name: getLocalizedOperatorName(info.name, language),
          value: info.name,
          picked: isPicked(info),
        }))

      const candidateOperators = operatorIdentities.map((identity) => {
        const item: Item = {
          key: identity.name + identity.role,
          name: getLocalizedOperatorName(identity.name, language),
          value: identity.name,
          picked: true,
        }
        const info = findOperatorsByIdentity(identity)[0]
        if (info) {
          return {
            ...item,
            key: info.id,
            operatorId: info.id,
          }
        }
        return item
      })

      const nonCandidateOperators = (
        candidateOperators.length
          ? OPERATORS.filter((info) => !candidateOperators.some((picked) => picked.operatorId === info.id))
          : OPERATORS
      ).map((info) => ({
        key: info.id,
        operatorId: info.id,
        name: getLocalizedOperatorName(info.name, language),
        value: info.name,
        picked: false,
      }))

      const items: Item[] = [
        ...groupNames.map((name, index) => ({
          key: name + index,
          isGroup: true,
          name,
          value: name,
        })),
        ...candidateOperators,
      ]

      if (items.length > 0) {
        items.push({ key: '__header__', isHeader: true })
      }
      items.push(...nonCandidateOperators)
      return items
    }, [operatorIdentities, groupedOperatorIdentities, groupNames, isOpen, language, showCandidates])

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
                  {item.isGroup ? (
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
                (operatorId ? operatorId === item.operatorId : value === item.value) || (markPicked && item.picked)
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
            onSelect?.(item.value, { operatorId: item.operatorId })
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
