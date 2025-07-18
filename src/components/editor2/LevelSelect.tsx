import { AnchorButton, Classes, MenuDivider, MenuItem } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { getCreateNewItem } from '@blueprintjs/select'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { FC, Ref, useEffect, useMemo, useState } from 'react'

import { useLevels } from '../../apis/level'
import { i18n, useTranslation } from '../../i18n/i18n'
import {
  createCustomLevel,
  getPrtsMapUrl,
  getStageIdWithDifficulty,
  isCustomLevel,
  isHardMode,
} from '../../models/level'
import { Level, OpDifficulty } from '../../models/operation'
import { formatError } from '../../utils/error'
import { useDebouncedQuery } from '../../utils/useDebouncedQuery'
import { Suggest } from '../Suggest'

interface LevelSelectProps {
  className?: string
  difficulty?: OpDifficulty
  name?: string
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
  value?: string
  onChange: (stageId: string, level?: Level) => void
}

export const LevelSelect: FC<LevelSelectProps> = ({
  className,
  difficulty,
  inputRef,
  value,
  onChange,
  ...inputProps
}) => {
  const t = useTranslation()
  // we are going to manually handle loading state so we could show the skeleton state easily,
  // without swapping the actual element.
  const { data, error: fetchError, isLoading } = useLevels()
  const levels = useMemo(
    () =>
      data
        // to simplify the list, we only show levels in normal mode
        .filter((level) => !isHardMode(level.stageId))
        .sort((a, b) => a.levelId.localeCompare(b.levelId)),
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
    return null
  }, [levels, value])

  const prtsMapUrl = selectedLevel
    ? getPrtsMapUrl(
        getStageIdWithDifficulty(
          selectedLevel.stageId,
          difficulty ?? OpDifficulty.UNKNOWN,
        ),
      )
    : undefined

  const filteredLevels = useMemo(() => {
    // 未输入 query 时显示同类关卡
    if (selectedLevel && !debouncedQuery) {
      let similarLevels: Level[]
      let headerName: string

      if (selectedLevel.catOne === '剿灭作战') {
        headerName = selectedLevel.catOne
        similarLevels = levels.filter(
          (el) => el.catOne === selectedLevel.catOne,
        )
      } else if (
        selectedLevel.stageId.includes('rune') ||
        selectedLevel.stageId.includes('crisis')
      ) {
        // 危机合约分类非常混乱，直接全塞到一起
        headerName = '危机合约'
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
        headerName = i18n.components.editor2.LevelSelect.related_levels
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
  }, [debouncedQuery, selectedLevel, levels, fuse])

  useEffect(() => {
    if (!selectedLevel) {
      setActiveItem(null)
    } else if (isCustomLevel(selectedLevel)) {
      setActiveItem('createNewItem')
    } else {
      setActiveItem(selectedLevel)
    }
  }, [selectedLevel])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Suggest<Level>
        items={levels}
        itemListPredicate={() => filteredLevels}
        activeItem={
          activeItem === 'createNewItem' ? getCreateNewItem() : activeItem
        }
        onActiveItemChange={(item, isCreateNewItem) => {
          setActiveItem(isCreateNewItem ? 'createNewItem' : item)
        }}
        resetOnQuery={false}
        query={query}
        onQueryChange={(query) => updateQuery(query, false)}
        onReset={() => onChange('')}
        disabled={isLoading}
        className={clsx(
          'items-stretch',
          isLoading && 'bp4-skeleton',
          className,
        )}
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
              text={`${item.catThree} ${item.name}`}
              onClick={handleClick}
              onFocus={handleFocus}
              onMouseDown={onOptionMouseDown}
              selected={item === selectedLevel}
              disabled={modifiers.disabled}
            />
          )
        }
        inputValueRenderer={(item) =>
          isCustomLevel(item)
            ? t.components.editor2.LevelSelect.custom_level({ name: item.name })
            : `${item.catThree} ${item.name}`
        }
        selectedItem={selectedLevel}
        onItemSelect={(level) => {
          if (!isCustomLevel(level)) {
            // 重置 query 以显示同类关卡
            updateQuery('', true)
          }
          onChange(level.stageId, level)
        }}
        createNewItemFromQuery={(query) => createCustomLevel(query)}
        createNewItemRenderer={(query, active, handleClick) => (
          <MenuItem
            key="create-new-item"
            roleStructure="listoption"
            className={clsx(active && Classes.ACTIVE)}
            text={`使用自定义关卡名 "${query}"`}
            icon="text-highlight"
            onClick={handleClick}
            selected={!!selectedLevel && isCustomLevel(selectedLevel)}
          />
        )}
        inputProps={{
          large: true,
          placeholder: t.components.editor2.LevelSelect.placeholder,
          inputRef,
          ...inputProps,
        }}
        popoverProps={{
          minimal: true,
          onClosed() {
            // 关闭下拉框时重置输入框，防止用户在未手动选择关卡时，误以为已输入的内容就是已选择的关卡
            updateQuery('', false)
          },
        }}
      />
      <Tooltip2
        placement="top"
        content={t.components.editor2.LevelSelect.view_external}
      >
        <AnchorButton
          minimal
          large
          icon="share"
          target="_blank"
          rel="noopener noreferrer"
          href={prtsMapUrl}
          disabled={!prtsMapUrl}
        />
      </Tooltip2>
      {fetchError && (
        <span className="text-xs opacity-50">
          {t.components.editor2.LevelSelect.load_error({
            error: formatError(fetchError),
          })}
        </span>
      )}
    </div>
  )
}
