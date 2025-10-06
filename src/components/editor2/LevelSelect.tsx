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
  compareLevelsForDisplay,
  createCustomLevel,
  findLevelByStageName,
  getPrtsMapUrl,
  getStageIdWithDifficulty,
  isCustomLevel,
  isHardMode,
} from '../../models/level'
import { Level, OpDifficulty } from '../../models/operation'
import { formatError } from '../../utils/error'
import { useDebouncedQuery } from '../../utils/useDebouncedQuery'
import { Suggest } from '../Suggest'
import { DifficultyPicker } from './DifficultyPicker'

interface LevelSelectProps {
  className?: string
  difficulty?: OpDifficulty
  name?: string
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
  value?: string
  fallbackLevel?: Level
  onChange: (stageId: string, level?: Level) => void
  onDifficultyChange?: (value: OpDifficulty, programmatically: boolean) => void
}

export const LevelSelect: FC<LevelSelectProps> = ({
  className,
  difficulty,
  inputRef,
  disabled,
  value,
  fallbackLevel,
  onChange,
  onDifficultyChange,
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
        .sort(compareLevelsForDisplay),
    [data],
  )
  const fuse = useMemo(
    () =>
      new Fuse(levels, {
        keys: ['game', 'name', 'catOne', 'catTwo', 'catThree', 'stageId'],
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
    if (!value) return null
    const fromStageName = findLevelByStageName(levels, value)
    if (fromStageName) return fromStageName
    if (fallbackLevel && (fallbackLevel.stageId === value || fallbackLevel.catThree === value || fallbackLevel.name === value)) {
      return fallbackLevel
    }
    return createCustomLevel(value)
  }, [levels, value, fallbackLevel])

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

  // 第一层：游戏分类
  const games = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const level of levels) {
      const g = (level.game || '明日方舟').trim()
      if (!seen.has(g)) {
        seen.add(g)
        result.push(g)
      }
    }
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const g = (selectedLevel.game || '明日方舟').trim()
      if (!seen.has(g)) {
        seen.add(g)
        result.push(g)
      }
    }
    return result
  }, [levels, selectedLevel])

  const [selectedGame, setSelectedGame] = useState<string>(() => {
    if (selectedLevel) {
      return (selectedLevel.game || '明日方舟').trim()
    }
    return games[0] ?? ''
  })

  useEffect(() => {
    if (!selectedGame && games.length) {
      setSelectedGame(games[0])
    }
  }, [games, selectedGame])

  const gameOptions = useMemo(() => {
    if (!selectedGame) return games
    if (games.includes(selectedGame)) return games
    return [...games, selectedGame]
  }, [games, selectedGame])

  const levelsInGame = useMemo(
    () =>
      selectedGame
        ? levels.filter(
            (l) => (l.game || '明日方舟').trim() === selectedGame.trim(),
          )
        : levels,
    [levels, selectedGame],
  )

  // 当选中关卡变化时，同步游戏筛选到该关卡所属游戏
  useEffect(() => {
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const g = (selectedLevel.game || '明日方舟').trim()
      if (g && g !== selectedGame) {
        setSelectedGame(g)
      }
    }
  }, [selectedLevel, selectedGame])

  const categories = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const level of levelsInGame) {
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
  }, [getLevelCategory, levelsInGame, selectedLevel])

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
          // 将输入框填充为已选关卡的显示文案，便于直观看到当前选择
          updateQuery(formatLevelInputValue(selectedLevel), true)
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
      const searchResults = fuse
        .search(trimmedQuery)
        .map((el) => el.item)
        .filter(
          (l) => !selectedGame || (l.game || '明日方舟').trim() === selectedGame,
        )
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
      ? levelsInGame.filter(
          (level) => getLevelCategory(level) === selectedCategory,
        )
      : levelsInGame

    return ensureIncludesSelected(levelsInCategory)
  }, [
    debouncedQuery,
    ensureIncludesSelected,
    fuse,
    getLevelCategory,
    levelsInGame,
    relatedLevelsLabel,
    selectedCategory,
    selectedLevel,
    selectedGame,
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

  // 同步输入框显示为当前选中关卡，避免初次加载为空白
  useEffect(() => {
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      updateQuery(formatLevelInputValue(selectedLevel), true)
    }
  }, [selectedLevel, updateQuery])

  const formatLevelInputValue = (level: Level) => {
    const trimmedName = level.name?.trim()
    if (trimmedName) {
      return trimmedName
    }
    return level.stageId
  }

  const formatLevelLabel = (level: Level) => {
    if (level.stageId === 'header') {
      return level.name
    }
    const parts = [
      (level.game || '明日方舟').trim(),
      level.catOne?.trim(),
      level.catTwo?.trim(),
      level.catThree?.trim(),
    ].filter(Boolean) as string[]
    if (parts.length) return parts.join(' / ')
    return formatLevelInputValue(level)
  }

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex w-full flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 w-44">
          <span className="text-xs font-medium text-slate-500">游戏</span>
          <Suggest<string>
            items={gameOptions}
            itemsEqual={(a, b) => a === b}
            selectedItem={selectedGame || null}
            disabled={disabled || isLoading || gameOptions.length === 0}
            className="w-full"
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
                  selected={item === selectedGame}
                  disabled={modifiers.disabled}
                />
              )
            }}
            inputValueRenderer={(item) => item ?? ''}
            onItemSelect={(game) => {
              if (!game || game === selectedGame) {
                return
              }
              setSelectedGame(game)
              setActiveItem(null)
              updateQuery('', true)
              if (!disabled && selectedLevel && !isCustomLevel(selectedLevel)) {
                onChange('')
              }
            }}
            inputProps={{
              large: true,
              placeholder: '游戏',
              disabled: disabled || isLoading || gameOptions.length === 0,
            }}
            popoverProps={{
              minimal: true,
            }}
          />
        </div>
        <div className="flex flex-col gap-1 w-56">
          <span className="text-xs font-medium text-slate-500">
            {t.components.editor2.LevelSelect.category_label}
          </span>
          <Suggest<string>
            items={categoryOptions}
            itemsEqual={(a, b) => a === b}
            selectedItem={selectedCategory || null}
            disabled={disabled || isLoading || categoryOptions.length === 0}
            className="w-full"
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
              if (!disabled && selectedLevel && !isCustomLevel(selectedLevel)) {
                onChange('')
              }
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
        <div className="flex items-end gap-2 w-[420px] max-w-full">
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
            className={clsx('w-full', isLoading && 'bp4-skeleton')}
            itemsEqual={(a, b) => a.stageId === b.stageId}
            itemDisabled={(item) => item.stageId === 'header'}
            itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
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
            )}
            inputValueRenderer={formatLevelInputValue}
            selectedItem={selectedLevel}
            onItemSelect={(level) => {
              if (!isCustomLevel(level)) {
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
        </div>
      </div>
      {/* 当 cat_one 为“活动”时，显示难度选择 */}
      {selectedLevel?.catOne === '活动' && (
        <div className="flex items-baseline">
          <span className="mr-2 text-xs font-medium text-slate-500">
            {i18n.components.editor.OperationEditor.stage_difficulty}
          </span>
          <DifficultyPicker
            stageName={value}
            value={difficulty}
            onChange={(val, programmatically) =>
              onDifficultyChange?.(val, programmatically)
            }
          />
        </div>
      )}
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
