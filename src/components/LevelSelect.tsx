import { Button, Classes, MenuDivider, MenuItem } from '@blueprintjs/core'
import { getCreateNewItem } from '@blueprintjs/select'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { FC, useEffect, useMemo, useState } from 'react'

import { useLevels } from '../apis/level'
import { useTranslation } from '../i18n/i18n'
import {
  compareLevelsForDisplay,
  createCustomLevel,
  isCustomLevel,
  isHardMode,
} from '../models/level'
import { Level } from '../models/operation'
import { useDebouncedQuery } from '../utils/useDebouncedQuery'
import { Select } from './Select'

interface LevelSelectProps {
  className?: string
  value: string
  onChange: (level: string) => void
}

export const LevelSelect: FC<LevelSelectProps> = ({
  className,
  value,
  onChange,
}) => {
  const t = useTranslation()
  const { data } = useLevels()
  const levels = useMemo(
    () =>
      data
        // to simplify the list, we only show levels in normal mode
        .filter((level) => !isHardMode(level.stageId))
        .sort(compareLevelsForDisplay),
    [data],
  )
  const fuse = useMemo(
    () =>
      new Fuse(levels, {
        keys: ['name', 'catTwo', 'catThree', 'stageId'],
        threshold: 0.3,
      }),
    [levels],
  )

  const { query, debouncedQuery, updateQuery, onOptionMouseDown } =
    useDebouncedQuery({
      onDebouncedQueryChange: (value) => {
        if (value !== debouncedQuery) {
          // 清空 activeItem，之后会自动设置为第一项
          setActiveItem(null)
        }
      },
    })
  const [activeItem, setActiveItem] = useState<Level | 'createNewItem' | null>(
    null,
  )

  const selectedLevel = useMemo(() => {
    const level = levels.find((el) => el.stageId === value)
    if (level) {
      return level
    }
    // 如果有 value 但匹配不到，就创建一个自定义关卡来显示
    if (value) {
      return createCustomLevel(value)
    }
    return undefined
  }, [levels, value])

  const filteredLevels = useMemo(() => {
    // 未输入 query 时显示同类关卡
    if (selectedLevel && !debouncedQuery) {
      let similarLevels: Level[]
      let headerName: string

      if (selectedLevel.catOne === '剿灭作战') {
        headerName = t.components.LevelSelect.annihilation
        similarLevels = levels.filter(
          (el) => el.catOne === selectedLevel.catOne,
        )
      } else if (
        selectedLevel.stageId.includes('rune') ||
        selectedLevel.stageId.includes('crisis')
      ) {
        // 危机合约分类非常混乱，直接全塞到一起
        headerName = t.components.LevelSelect.contingency_contract
        similarLevels = levels.filter(
          (el) => el.stageId.includes('rune') || el.stageId.includes('crisis'),
        )
      } else if (selectedLevel.catTwo) {
        headerName = selectedLevel.catTwo
        similarLevels = levels.filter(
          (el) => el.catTwo === selectedLevel.catTwo,
        )
      } else {
        // catTwo 为空的时候用 levelId 来分类
        headerName = t.components.LevelSelect.related_levels
        const levelIdPrefix = selectedLevel.levelId
          .split('/')
          .slice(0, -1)
          .join('/')
        similarLevels = levelIdPrefix
          ? levels.filter((el) => el.levelId.startsWith(levelIdPrefix))
          : []
      }

      if (similarLevels.length > 1) {
        const header = createCustomLevel('header')
        header.name = headerName
        return [header, ...similarLevels]
      }
    }

    return debouncedQuery.trim()
      ? fuse.search(debouncedQuery).map((el) => el.item)
      : levels
  }, [debouncedQuery, selectedLevel, levels, fuse, t])

  useEffect(() => {
    if (!selectedLevel) {
      setActiveItem(null)
    } else if (isCustomLevel(selectedLevel)) {
      setActiveItem('createNewItem')
    } else {
      setActiveItem(selectedLevel)
    }
  }, [selectedLevel])

  const formatLevelLabel = (level: Level) => {
    const parts = [level.catOne, level.catTwo, level.catThree]
      .map((part) => part?.trim())
      .filter(Boolean) as string[]
    if (parts.length) {
      return parts.join(' - ')
    }
    if (level.name?.trim()) {
      return level.name
    }
    return level.stageId
  }

  return (
    <Select<Level>
      items={levels}
      itemListPredicate={() => filteredLevels}
      activeItem={
        activeItem === 'createNewItem' ? getCreateNewItem() : activeItem
      }
      onActiveItemChange={(item, isCreateNewItem) => {
        setActiveItem(isCreateNewItem ? 'createNewItem' : item)
      }}
      query={query}
      onQueryChange={(query) => updateQuery(query, false)}
      onReset={() => onChange('')}
      className={clsx('items-stretch', className)}
      itemsEqual={(a, b) => a.stageId === b.stageId}
      itemDisabled={(item) => item.stageId === 'header'} // 避免 header 被选中为 active
      itemRenderer={(item, { handleClick, handleFocus, modifiers }) =>
        item.stageId === 'header' ? (
          <MenuDivider key="header" title={item.name} />
        ) : (
          <MenuItem
            roleStructure="listoption"
            key={item.stageId}
            className={clsx(modifiers.active && Classes.ACTIVE)}
            text={formatLevelLabel(item)}
            onClick={handleClick}
            onFocus={handleFocus}
            onMouseDown={onOptionMouseDown}
            selected={item === selectedLevel}
            disabled={modifiers.disabled}
          />
        )
      }
      selectedItem={selectedLevel}
      onItemSelect={(level) => {
        if (!isCustomLevel(level)) {
          // 重置 query 以显示同类关卡
          updateQuery('', true)
        }
        onChange(level.stageId)
      }}
      createNewItemFromQuery={(query) => createCustomLevel(query)}
      createNewItemRenderer={(query, active, handleClick) => (
        <MenuItem
          key="create-new-item"
          roleStructure="listoption"
          className={clsx(active && Classes.ACTIVE)}
          text={t.components.LevelSelect.search_level({ query })}
          icon="text-highlight"
          onClick={handleClick}
          selected={selectedLevel && isCustomLevel(selectedLevel)}
        />
      )}
      inputProps={{
        placeholder: t.components.LevelSelect.level_search_placeholder,
      }}
      popoverProps={{
        minimal: true,
      }}
    >
      {
        <Button
          minimal
          className="!pl-3 !pr-2"
          icon="area-of-interest"
          rightIcon="chevron-down"
        >
          {selectedLevel
            ? formatLevelLabel(selectedLevel)
            : t.components.LevelSelect.level}
        </Button>
      }
    </Select>
  )
}
