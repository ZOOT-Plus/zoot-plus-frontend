import { AnchorButton, Classes, MenuDivider, MenuItem } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { getCreateNewItem } from '@blueprintjs/select'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import {
  FC,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

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
  disabled,
  value,
  onChange,
  ...inputProps
}) => {
  const t = useTranslation()
  const relatedLevelsLabel = i18n.components.editor2.LevelSelect.related_levels
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

  const getLevelCategory = useCallback(
    (level: Level) =>
      level.catOne?.trim() ||
      level.catTwo?.trim() ||
      level.catThree?.trim() ||
      relatedLevelsLabel,
    [relatedLevelsLabel],
  )

  const categories = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const level of levels) {
      const category = getLevelCategory(level)
      if (!seen.has(category)) {
        seen.add(category)
        result.push(category)
      }
    }
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const category = getLevelCategory(selectedLevel)
      if (!seen.has(category)) {
        seen.add(category)
        result.push(category)
      }
    }
    return result
  }, [getLevelCategory, levels, selectedLevel])

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (selectedLevel) {
      return getLevelCategory(selectedLevel)
    }
    return categories[0] ?? ''
  })

  useEffect(() => {
    if (!selectedCategory && categories.length) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  const categoryOptions = useMemo(() => {
    if (!selectedCategory) {
      return categories
    }
    if (categories.includes(selectedCategory)) {
      return categories
    }
    return [...categories, selectedCategory]
  }, [categories, selectedCategory])

  const previousValueRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (value !== previousValueRef.current) {
      previousValueRef.current = value

      if (selectedLevel && !isCustomLevel(selectedLevel)) {
        const category = getLevelCategory(selectedLevel)
        if (category && category !== selectedCategory) {
          setSelectedCategory(category)
          updateQuery('', true)
        }
        return
      }

      if (!selectedCategory && categories.length) {
        setSelectedCategory(categories[0])
      }
    }
  }, [
    categories,
    getLevelCategory,
    selectedCategory,
    selectedLevel,
    updateQuery,
    value,
  ])

  const ensureIncludesSelected = useCallback(
    (list: Level[]) => {
      if (
        selectedLevel &&
        !list.some((level) => level.stageId === selectedLevel.stageId)
      ) {
        return [selectedLevel, ...list]
      }
      return list
    },
    [selectedLevel],
  )

  const filteredLevels = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim()

    if (trimmedQuery) {
      const searchResults = fuse.search(trimmedQuery).map((el) => el.item)
      const filteredResults = selectedCategory
        ? searchResults.filter(
            (level) => getLevelCategory(level) === selectedCategory,
          )
        : searchResults
      return ensureIncludesSelected(
        filteredResults.length ? filteredResults : searchResults,
      )
    }

    if (selectedLevel) {
      let similarLevels: Level[] = []
      let headerName = relatedLevelsLabel

      if (selectedLevel.catOne === '剿灭作战') {
        headerName = selectedLevel.catOne
        similarLevels = levels.filter(
          (level) => level.catOne === selectedLevel.catOne,
        )
      } else if (
        selectedLevel.stageId.includes('rune') ||
        selectedLevel.stageId.includes('crisis')
      ) {
        headerName = '危机合约'
        similarLevels = levels.filter(
          (level) =>
            level.stageId.includes('rune') || level.stageId.includes('crisis'),
        )
      } else if (selectedLevel.catTwo) {
        headerName = selectedLevel.catTwo
        similarLevels = levels.filter(
          (level) => level.catTwo === selectedLevel.catTwo,
        )
      } else {
        const levelIdPrefix = selectedLevel.levelId
          .split('/')
          .slice(0, -1)
          .join('/')
        similarLevels = levelIdPrefix
          ? levels.filter((level) => level.levelId.startsWith(levelIdPrefix))
          : []
      }

      if (selectedCategory) {
        similarLevels = similarLevels.filter(
          (level) => getLevelCategory(level) === selectedCategory,
        )
      }

      if (similarLevels.length > 1) {
        const header = createCustomLevel('header')
        header.name = headerName
        return ensureIncludesSelected([header, ...similarLevels])
      }

      if (similarLevels.length === 1) {
        return ensureIncludesSelected(similarLevels)
      }
    }

    const levelsInCategory = selectedCategory
      ? levels.filter((level) => getLevelCategory(level) === selectedCategory)
      : levels

    return ensureIncludesSelected(levelsInCategory)
  }, [
    debouncedQuery,
    ensureIncludesSelected,
    fuse,
    getLevelCategory,
    levels,
    relatedLevelsLabel,
    selectedCategory,
    selectedLevel,
  ])

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
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm whitespace-nowrap">
          {t.components.editor2.LevelSelect.category_label}
        </span>
        <Suggest<string>
          items={categoryOptions}
          itemsEqual={(a, b) => a === b}
          selectedItem={selectedCategory || null}
          disabled={disabled || isLoading || categoryOptions.length === 0}
          itemListPredicate={(search, items) => {
            const normalized = (search ?? '').trim().toLowerCase()
            if (!normalized) {
              return items
            }
            return items.filter((item) =>
              item.toLowerCase().includes(normalized),
            )
          }}
          itemRenderer={(item, { handleClick, handleFocus, modifiers }) => {
            if (modifiers.matchesPredicate === false) {
              return null
            }
            return (
              <MenuItem
                roleStructure="listoption"
                key={item}
                className={clsx(modifiers.active && Classes.ACTIVE)}
                text={item}
                onClick={handleClick}
                onFocus={handleFocus}
                onMouseDown={onOptionMouseDown}
                selected={item === selectedCategory}
                disabled={modifiers.disabled}
              />
            )
          }}
          inputValueRenderer={(item) => item ?? ''}
          onItemSelect={(category) => {
            if (!category || category === selectedCategory) {
              return
            }
            setSelectedCategory(category)
            setActiveItem(null)
            updateQuery('', true)
          }}
          inputProps={{
            large: true,
            placeholder: t.components.editor2.LevelSelect.category_label,
            disabled: disabled || isLoading || categoryOptions.length === 0,
          }}
          popoverProps={{
            minimal: true,
          }}
        />
      </div>
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
        onReset={() => {
          if (!disabled) {
            onChange('')
          }
        }}
        disabled={disabled || isLoading}
        className={clsx(
          'items-stretch flex-1',
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
              text={formatLevelLabel(item)}
              onClick={handleClick}
              onFocus={handleFocus}
              onMouseDown={onOptionMouseDown}
              selected={item === selectedLevel}
              disabled={modifiers.disabled}
            />
          )
        }
        inputValueRenderer={formatLevelLabel}
        selectedItem={selectedLevel}
        onItemSelect={(level) => {
          if (!isCustomLevel(level)) {
            // 重置 query 以显示同类关卡
            updateQuery('', true)
          }
          if (!disabled) {
            onChange(level.stageId, level)
          }
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
          disabled,
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
          disabled={disabled || !prtsMapUrl}
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
