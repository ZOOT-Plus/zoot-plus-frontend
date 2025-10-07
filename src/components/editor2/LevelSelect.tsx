import { Classes, MenuDivider, MenuItem } from '@blueprintjs/core'
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
  findLevelByStageName,  isCustomLevel,
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
  // 当选择了“游戏”或“分类”时，上抛一个用于筛选的关键字
  onFilterChange?: (keyword: string, meta?: { game?: string; catOne?: string }) => void
  // 可选：当没有已选关卡时，为弹层提供上次筛选的默认游戏/分类，便于回显
  defaultGame?: string
  defaultCategory?: string
  // 自定义 Portal 容器，确保下拉菜单渲染在 Overlay 容器内，避免被判定为“外部点击”
  portalContainer?: HTMLElement | undefined | null
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
  onFilterChange,
  defaultGame,
  defaultCategory,
  portalContainer,
  ...inputProps
}) => {
  const t = useTranslation()
  const relatedLevelsLabel = i18n.components.editor2.LevelSelect.related_levels
  const NO_GAME_LABEL = '未分类'
  const normalizeGame = (game?: string) => {
    const g = (game || '').trim()
    return g || NO_GAME_LABEL
  }
  // 让“通用”能在选择“如鸢”或“代号鸢”时一并被搜索/筛选到
  const matchesGame = useCallback(
    (levelGame: string | undefined, selected: string | undefined) => {
      const ng = normalizeGame(levelGame)
      const sg = (selected || '').trim()
      if (!sg) return true
      if (ng === sg) return true
      if (ng === '通用' && (sg === '如鸢' || sg === '代号鸢')) return true
      return false
    },
    [],
  )
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
      const g = normalizeGame(level.game)
      if (!seen.has(g)) {
        seen.add(g)
        result.push(g)
      }
    }
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const g = normalizeGame(selectedLevel.game)
      if (g && !seen.has(g)) {
        seen.add(g)
        result.push(g)
      }
    }
    return result
  }, [levels, selectedLevel])

  const [selectedGame, setSelectedGame] = useState<string>(() => {
    if (selectedLevel) {
      return normalizeGame(selectedLevel.game)
    }
    // 没有关卡时，尝试使用父组件传入的默认游戏以便回显
    return normalizeGame(defaultGame)
  })

  // 取消自动选择首个游戏，避免“强制重置”

  const gameOptions = useMemo(() => {
    if (!selectedGame) return games
    if (games.includes(selectedGame)) return games
    return [...games, selectedGame]
  }, [games, selectedGame])

  const levelsInGame = useMemo(
    () =>
      selectedGame
        ? levels.filter((l) => matchesGame(l.game, selectedGame))
        : levels,
    [levels, selectedGame, matchesGame],
  )

  // 当选中关卡变化时，必要时同步游戏筛选到该关卡所属游戏
  // 仅在当前未选择游戏（或为“未分类”占位）时同步，避免用户手动更改被覆盖
  useEffect(() => {
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const g = normalizeGame(selectedLevel.game)
      if (g && (!selectedGame || selectedGame === NO_GAME_LABEL)) {
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
    // 仅当“已选关卡”属于当前选中的游戏时，才补充其分类；
    // 若选中的是“如鸢/代号鸢”，亦包含其“通用”关卡的分类（matchesGame）。
    if (selectedLevel && !isCustomLevel(selectedLevel)) {
      const category = getLevelCategory(selectedLevel)
      const levelGame = normalizeGame(selectedLevel.game)
      if (
        selectedGame &&
        matchesGame(levelGame, selectedGame) &&
        !seen.has(category)
      ) {
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
    // 没有关卡时，尝试使用父组件传入的默认分类以便回显
    return (defaultCategory ?? '').trim()
  })

  // 取消自动选择首个分类，避免“强制重置”

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
      // 不再在无选中关卡时强制设定首个分类
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
        .filter((l) => !selectedGame || matchesGame(l.game, selectedGame))
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
    // 下拉项与选择后展示仅显示关卡名，若无则回退至 stageId
    if (level.stageId === 'header') return level.name
    const trimmedName = level.name?.trim()
    return trimmedName || level.stageId
  }

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex w-full flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 w-36">
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
              // 重置后面两个选项：分类 与 关卡输入/选择
              setSelectedCategory('')
              setActiveItem(null)
              updateQuery('', true)
              if (!disabled) {
                // 无条件清空选中关卡，避免跨游戏保留无效值
                onChange('')
              }
              // 选择“游戏”时仅按游戏发起筛选（分类已被重置）
              const gameForQuery = game === NO_GAME_LABEL ? '' : game
              const kw = gameForQuery
              onFilterChange?.(kw, { game: gameForQuery || undefined })
            }}
            inputProps={{
              large: true,
              placeholder: '游戏',
              disabled: disabled || isLoading || gameOptions.length === 0,
            }}
            popoverProps={{
              minimal: true,
              captureDismiss: true,
              portalContainer: portalContainer ?? undefined,
              // 保证在父层 Overlay 之上
              zIndex: 2147483001,
            }}
          />
        </div>
        <div className="flex flex-col gap-1 w-44">
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
              // 分类变化时无条件清空关卡，避免跨分类残留
              if (!disabled) {
                onChange('')
              }
              // 选择“分类”时触发一次筛选查询（按 当前游戏 + 分类 拼接）
              const kw = [selectedGame, category].filter(Boolean).join(' ')
              onFilterChange?.(kw, { game: selectedGame || undefined, catOne: category })
            }}
            inputProps={{
              large: true,
              placeholder: t.components.editor2.LevelSelect.category_label,
              disabled: disabled || isLoading || categoryOptions.length === 0,
            }}
            popoverProps={{
              minimal: true,
              captureDismiss: true,
              portalContainer: portalContainer ?? undefined,
              zIndex: 2147483001,
            }}
          />
        </div>
        <div className="flex items-end gap-2 w-[240px] max-w-full">
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
              captureDismiss: true,
              portalContainer: portalContainer ?? undefined,
              zIndex: 2147483001,
              onClosed() {
                updateQuery('', false)
              },
            }}
          />
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
