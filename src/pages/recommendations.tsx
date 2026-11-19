import { Button, Callout, Checkbox, Icon, InputGroup, Menu, MenuItem, Spinner, Tag } from '@blueprintjs/core'
import { cloneElement, memo, ReactElement, useDeferredValue, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useRecommendations } from 'apis/recommendation'
import { OperatorAvatar } from 'components/OperatorAvatar'
import { Select } from 'components/Select'
import { useTranslation } from 'i18n/i18n'
import { CopilotDocV1 } from 'models/copilot.schema'
import { findOperatorById, getModuleName, useLocalizedOperatorName } from 'models/operator'
import { OperatorRecommendation, TrainingBranch, recommendationParams } from 'models/recommendation'
import 'styles/recommendations.css'

const ROLES = ['Pioneer', 'Warrior', 'Tank', 'Sniper', 'Caster', 'Medic', 'Support', 'Special'] as const
const RARITIES = ['1', '2', '3', '4', '5', '6'] as const
const MIN_BRANCH_USAGE_SHARE = 0.005
const percent = (value: number) => Math.round(value * 100)

export const RecommendationsPage = () => {
  const t = useTranslation().pages.recommendations
  const translations = useTranslation()
  const [search, setSearch] = useSearchParams()
  const params = recommendationParams(search)
  const { data, activities, error, isLoading, isValidating, mutate } = useRecommendations(params)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [moreVisible, setMoreVisible] = useState(
    () =>
      params.days !== (params.scope === 'HISTORY' ? 0 : 180) ||
      params.coverage !== 0.8 ||
      params.includeClosed ||
      !params.includeAlternatives ||
      params.includeUncertain,
  )
  const filterPanelId = useId()
  const moreOptionsId = useId()
  const patch = (key: string, value: string) => {
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'scope' && value !== params.scope) {
          for (const filter of ['days', 'category', 'activity', 'stageId', 'closed']) next.delete(filter)
        }
        if (key === 'category') {
          next.delete('activity')
          next.delete('stageId')
        }
        if (key === 'activity' && value !== (previous.get('activity') ?? '')) next.delete('stageId')
        return next
      },
      { replace: true },
    )
  }
  const query = useDeferredValue(search.get('q')?.trim().toLowerCase() ?? '')
  const role = ROLES.find((role) => role === search.get('role')) ?? ''
  const rarity = RARITIES.find((rarity) => rarity === search.get('rarity')) ?? ''
  const searchable = useMemo(
    () =>
      data?.recommendations.map((item) => {
        const info = findOperatorById(item.operator.id)
        return {
          item,
          text: [item.operator.name, info?.name_en, info?.alias, info?.alt_name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        }
      }) ?? [],
    [data?.recommendations],
  )
  const recommendations = useMemo(
    () =>
      searchable
        .filter(
          ({ item, text }) =>
            (!role || item.operator.role === role) &&
            (rarity ? item.operator.rarity === Number(rarity) : item.operator.rarity > 3) &&
            (!query || text.includes(query)),
        )
        .map(({ item }) => item),
    [searchable, role, rarity, query],
  )
  const stages = useMemo(
    () =>
      data?.stages.filter(
        (stage) =>
          (!params.category || stage.category === params.category) &&
          (!params.activity || stage.activity === params.activity),
      ) ?? [],
    [data?.stages, params.category, params.activity],
  )
  const activityItems = useMemo(() => (activities ?? []).map((name) => ({ id: name, name })), [activities])
  const stageNames = useMemo(() => new Map(data?.stages.map((stage) => [stage.id, stage.name])), [data?.stages])
  const filterKey = JSON.stringify([params, query, role, rarity])

  return (
    <main id="recommendations" className="recommendations-page max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 min-w-0">
      <header className="mb-7 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 break-words">{t.title}</h1>
        <p className="text-zinc-600 dark:text-slate-300 leading-relaxed">{t.intro}</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-5 xl:gap-7 items-start">
        <aside className="lg:sticky lg:top-20 min-w-0" aria-label={t.filters}>
          <Button
            className="recommendations-filter-toggle lg:!hidden"
            fill
            icon="filter"
            rightIcon={filtersVisible ? 'chevron-up' : 'chevron-down'}
            aria-expanded={filtersVisible}
            aria-controls={filterPanelId}
            onClick={() => setFiltersVisible((value) => !value)}
          >
            {t.filters}
          </Button>
          <div
            id={filterPanelId}
            className={`recommendations-filters ${filtersVisible ? 'grid mt-3 lg:mt-0' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 p-5 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}
          >
            <div className="sm:col-span-2 lg:col-span-1 flex items-center gap-2 pb-1">
              <Icon icon="filter" className="text-violet-600 dark:text-violet-300" />
              <h2 className="font-semibold">{t.filters}</h2>
            </div>
            <Filter label={t.scope}>
              <FilterSelect
                items={(['RECENT', 'PERMANENT', 'HISTORY'] as const).map((id) => ({ id, name: t.scopes[id] }))}
                value={params.scope}
                onChange={(value) => patch('scope', value)}
                label={t.scope}
              />
            </Filter>
            <p className="text-xs text-zinc-500 dark:text-slate-400 leading-relaxed sm:col-span-2 lg:col-span-1">
              {t.scope_help[params.scope]}
            </p>
            <Filter label={t.category}>
              <FilterSelect
                items={[{ id: '', name: t.all }, ...(data?.categories ?? []).map((id) => ({ id, name: id }))]}
                value={params.category ?? ''}
                onChange={(value) => patch('category', value)}
                label={t.category}
              />
            </Filter>
            <Filter label={t.activity}>
              <FilterSelect
                items={activityItems}
                disabled={activities === undefined}
                value={params.activity ?? ''}
                onChange={(value) => patch('activity', value)}
                placeholder={t.activity_search}
                label={t.activity}
              />
            </Filter>
            <Filter label={t.stage}>
              <FilterSelect
                items={stages}
                value={params.stageId ?? ''}
                onChange={(value) => patch('stageId', value)}
                placeholder={t.stage_search}
                label={t.stage}
              />
            </Filter>
            <div className="recommendations-options sm:col-span-2 lg:col-span-1 pt-4">
              <Button
                fill
                minimal
                rightIcon={moreVisible ? 'chevron-up' : 'chevron-down'}
                aria-expanded={moreVisible}
                aria-controls={moreOptionsId}
                onClick={() => setMoreVisible((value) => !value)}
              >
                {t.more_options}
              </Button>
              <div id={moreOptionsId} hidden={!moreVisible} className={moreVisible ? 'grid gap-4 mt-4' : 'hidden'}>
                {params.scope !== 'PERMANENT' && (
                  <Filter label={t.days}>
                    <FilterSelect
                      items={(params.scope === 'HISTORY' ? [90, 180, 365, 0] : [90, 180, 365]).map((days) => ({
                        id: String(days),
                        name: days ? t.day_count({ count: days }) : t.all_time,
                      }))}
                      value={String(params.days)}
                      onChange={(value) => patch('days', value)}
                      label={t.days}
                    />
                  </Filter>
                )}
                <Filter label={t.coverage}>
                  <FilterSelect
                    items={[
                      { id: '0.6', name: t.basic },
                      { id: '0.8', name: t.practical },
                      { id: '0.9', name: t.extensive },
                    ]}
                    value={String(params.coverage)}
                    onChange={(value) => patch('coverage', value)}
                    label={t.coverage}
                  />
                </Filter>
                <p className="text-xs text-zinc-500 dark:text-slate-400 leading-relaxed">{t.target_help}</p>
                <Checkbox
                  checked={params.includeAlternatives}
                  onChange={(event) => patch('alternatives', event.currentTarget.checked ? '' : '0')}
                >
                  {t.alternatives}
                </Checkbox>
                {params.scope !== 'PERMANENT' && (
                  <Checkbox
                    checked={params.includeClosed}
                    onChange={(event) => patch('closed', event.currentTarget.checked ? '1' : '')}
                  >
                    {t.closed}
                  </Checkbox>
                )}
                <Checkbox
                  checked={params.includeUncertain}
                  onChange={(event) => patch('uncertain', event.currentTarget.checked ? '1' : '')}
                >
                  {t.uncertain}
                </Checkbox>
              </div>
              <Button className="recommendations-reset mt-4" fill minimal icon="reset" onClick={() => setSearch({})}>
                {t.reset}
              </Button>
            </div>
          </div>
        </aside>
        <section className="min-w-0" aria-label={t.title} aria-busy={isValidating}>
          <div className="recommendations-toolbar grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] gap-3 p-4 mb-4 items-end">
            <div className="col-span-2 sm:col-span-1 min-w-0">
              <Filter label={t.search}>
                <InputGroup
                  value={search.get('q') ?? ''}
                  onChange={(event) => patch('q', event.target.value)}
                  leftIcon="search"
                  placeholder={t.search}
                />
              </Filter>
            </div>
            <Filter label={t.profession}>
              <FilterSelect
                items={[
                  { id: '', name: t.all },
                  ...ROLES.map((id) => ({ id, name: translations.models.operator.role[id] })),
                ]}
                value={role}
                onChange={(value) => patch('role', value)}
                label={t.profession}
              />
            </Filter>
            <Filter label={t.rarity}>
              <FilterSelect
                items={[
                  { id: '', name: t.four_stars_and_above },
                  ...RARITIES.map((id) => ({ id, name: t.stars({ count: Number(id) }) })),
                ]}
                value={rarity}
                onChange={(value) => patch('rarity', value)}
                label={t.rarity}
              />
            </Filter>
          </div>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mb-5 leading-relaxed">{t.note}</p>
          {error && (
            <Callout className="mb-4" intent="danger" title={t.error}>
              {data && <p className="mb-2">{t.previous_results}</p>}
              <Button intent="primary" icon="refresh" onClick={() => mutate()}>
                {t.retry}
              </Button>
            </Callout>
          )}
          {!data && !error && (
            <output className="block py-16" aria-label={translations.common.loading}>
              <Spinner />
            </output>
          )}
          {data && (
            <>
              {(isLoading || isValidating) && (
                <output className="flex items-center gap-2 text-sm mb-4 text-zinc-600 dark:text-slate-300">
                  <Spinner size={16} />
                  {t.updating}
                </output>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-5" aria-live="polite">
                <strong>{t.results({ count: recommendations.length })}</strong>
                <span className="text-zinc-500 dark:text-slate-400">
                  {t.summary({ operations: data.operationCount, families: data.familyCount })}
                </span>
              </div>
              {recommendations.length === 0 ? (
                <Callout title={t.empty}>{t.empty_help}</Callout>
              ) : (
                <RecommendationList items={recommendations} filterKey={filterKey} stageNames={stageNames} />
              )}
              <p className="text-xs text-zinc-500 dark:text-slate-400 mt-5">
                {t.updated({ time: data.generatedAt.replace('T', ' ').slice(0, 19) })}
              </p>
              {data.invalidCount > 0 && (
                <p className="text-xs text-zinc-500 dark:text-slate-400 mt-2">
                  {t.invalid({ count: data.invalidCount })}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

const Filter = ({
  label,
  children,
}: {
  label: string
  children: ReactElement<{ id?: string; 'aria-labelledby'?: string }>
}) => {
  const id = useId()
  return (
    <div className="min-w-0">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-2"
      >
        {label}
      </label>
      {cloneElement(children, { id, 'aria-labelledby': `${id}-label` })}
    </div>
  )
}

const FilterSelect = ({
  items,
  value,
  onChange,
  placeholder,
  label,
  disabled,
  ...buttonProps
}: {
  items: { id: string; name: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label: string
  disabled?: boolean
  id?: string
  'aria-labelledby'?: string
}) => {
  const t = useTranslation().pages.recommendations
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/)
    return items.filter((item) => words.every((word) => `${item.name} ${item.id}`.toLowerCase().includes(word)))
  }, [items, query])
  const selected = items.find((item) => item.id === value) ?? (value ? { id: value, name: value } : undefined)
  return (
    <Select
      fill
      disabled={disabled}
      className={`recommendations-select ${placeholder && value ? 'recommendations-select-clearable' : ''}`}
      filterable={!!placeholder}
      canReset={!!placeholder && !!value}
      items={items}
      itemsEqual="id"
      query={query}
      onQueryChange={setQuery}
      itemListPredicate={() => (placeholder ? matches.slice(0, 50) : matches)}
      selectedItem={selected}
      onReset={() => onChange('')}
      resetButtonProps={{ 'aria-label': t.clear_filter({ filter: label }), className: 'recommendations-clear' }}
      resetOnClose
      resetOnSelect
      onItemSelect={(item) => onChange(item.id)}
      inputProps={{ placeholder, 'aria-label': placeholder, className: 'recommendations-menu-search' }}
      popoverTargetProps={placeholder ? undefined : { 'aria-labelledby': buttonProps['aria-labelledby'] }}
      popoverProps={{
        minimal: true,
        matchTargetWidth: !!placeholder,
        placement: 'bottom-start',
        modifiers: { offset: { options: { offset: [0, 8] } } },
        popoverClassName: `recommendations-popover ${placeholder ? '' : 'recommendations-popover-options'}`,
      }}
      itemListRenderer={({ filteredItems, renderItem, itemsParentRef, menuProps }) => (
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Blueprint QueryList requires a Menu listbox for keyboard navigation.
        <Menu {...menuProps} role="listbox" ulRef={itemsParentRef} className="recommendations-menu">
          {(matches.length === 0 || (placeholder && matches.length > 50)) && (
            <li role="presentation" className="px-2 py-3 text-sm text-zinc-600 dark:text-slate-300">
              <output>{matches.length === 0 ? t.no_matches : t.refine_search}</output>
            </li>
          )}
          {filteredItems.map(renderItem)}
        </Menu>
      )}
      itemRenderer={(item, { handleClick, handleFocus, modifiers, id, ref }) => (
        <MenuItem
          key={item.id}
          id={id}
          ref={ref}
          roleStructure="listoption"
          multiline={!placeholder}
          active={modifiers.active}
          selected={item.id === value}
          onClick={handleClick}
          onFocus={handleFocus}
          htmlTitle={`${item.name || item.id}${placeholder && item.name && item.name !== item.id ? ` · ${item.id}` : ''}`}
          text={
            <>
              <div className={placeholder ? 'truncate' : 'whitespace-nowrap'}>{item.name || item.id}</div>
              {placeholder && item.name && item.name !== item.id && (
                <div className="truncate text-xs text-zinc-600 dark:text-slate-300">{item.id}</div>
              )}
            </>
          }
        />
      )}
    >
      <Button
        {...buttonProps}
        fill
        disabled={disabled}
        alignText="left"
        rightIcon="caret-down"
        title={selected?.name || value || t.all}
        className="recommendations-select-trigger"
      >
        {selected?.name || value || t.all}
      </Button>
    </Select>
  )
}

const RecommendationList = ({
  items,
  filterKey,
  stageNames,
}: {
  items: OperatorRecommendation[]
  filterKey: string
  stageNames: Map<string, string>
}) => {
  const t = useTranslation().pages.recommendations
  const [pagination, setPagination] = useState({ key: filterKey, visible: 30 })
  const visible = pagination.key === filterKey ? pagination.visible : 30
  if (pagination.key !== filterKey) setPagination({ key: filterKey, visible: 30 })
  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {items.slice(0, visible).map((item) => (
          <RecommendationRow key={item.operator.id} item={item} stageNames={stageNames} />
        ))}
      </div>
      {items.length > visible && (
        <Button
          className="mt-4"
          fill
          rightIcon="chevron-down"
          onClick={() => setPagination({ key: filterKey, visible: visible + 30 })}
        >
          {t.show_more}
        </Button>
      )}
    </div>
  )
}

const RecommendationRow = memo(
  ({ item, stageNames }: { item: OperatorRecommendation; stageNames: Map<string, string> }) => {
    const translations = useTranslation()
    const t = translations.pages.recommendations
    const name = useLocalizedOperatorName(item.operator.name)
    const [expanded, setExpanded] = useState(false)
    const branches = item.branches.filter((branch) => branch.usageShare >= MIN_BRANCH_USAGE_SHARE)
    return (
      <article className="recommendations-card min-w-0" aria-label={name}>
        <div className="flex gap-3 items-center min-w-0 p-5 pb-4">
          <OperatorAvatar
            id={item.operator.id}
            rarity={item.operator.rarity}
            fallback={name}
            sourceSize={96}
            className="!w-14 !h-14 !rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center justify-between mb-1.5">
              <h3 className="text-lg font-semibold break-words leading-tight">{name}</h3>
              <Tag
                className="recommendations-status"
                minimal
                intent={item.status === 'CURRENT' ? 'success' : undefined}
              >
                {t.status[item.status]}
              </Tag>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400">
              {translations.models.operator.role[
                item.operator.role as keyof typeof translations.models.operator.role
              ] ?? item.operator.role}
              {' · '}
              {t.stars({ count: item.operator.rarity })}
            </p>
          </div>
        </div>
        <div className="px-5 pb-4">
          {branches[0] && (
            <div className="recommendations-target p-3.5">
              <Branch branch={branches[0]} />
            </div>
          )}
          <p className="text-xs mt-3.5 text-zinc-500 dark:text-slate-400 leading-relaxed">
            {t.evidence({ stages: item.stageCount, families: item.familyCount })}
          </p>
        </div>
        <details
          className="recommendations-details min-w-0"
          onToggle={(event) => setExpanded(event.currentTarget.open)}
        >
          <summary className="flex flex-wrap items-center gap-2 cursor-pointer text-sm font-medium px-5 py-3">
            <span>{t.details}</span>
            {branches.length > 1 && (
              <span className="text-xs text-zinc-500 dark:text-slate-400">
                {t.target_count({ count: branches.length })}
              </span>
            )}
            <Icon icon="chevron-down" className="recommendations-details-chevron ml-auto" size={14} />
          </summary>
          {expanded && (
            <div className="px-5 pb-5 pt-1">
              <p className="text-xs text-zinc-500 dark:text-slate-400">
                {t.recent_evidence({ stages: item.recentStageCount, families: item.recentFamilyCount })}
              </p>
              <div className="grid gap-2 mt-3">
                {branches.map((branch, index) => (
                  <div key={index} className="recommendations-target p-3.5 min-w-0">
                    <Branch branch={branch} detailed />
                  </div>
                ))}
              </div>
              <h4 className="text-sm font-semibold mt-5 mb-2">{t.sources}</h4>
              <ul className="recommendations-sources space-y-3">
                {item.sources.map((source) => (
                  <li key={source.id} className="text-sm min-w-0">
                    <Link
                      to={`/operation/${source.id}`}
                      className="font-medium break-words underline-offset-4 hover:underline"
                    >
                      {source.title || `#${source.id}`}
                    </Link>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1 text-zinc-500 dark:text-slate-400">
                      <span title={source.stageId}>{stageNames.get(source.stageId) || source.stageId}</span>
                      <time dateTime={source.firstPublishedAt}>{source.firstPublishedAt.slice(0, 10)}</time>
                      <span>{t.votes({ likes: source.likes, dislikes: source.dislikes })}</span>
                      <span>{t.views({ count: source.views })}</span>
                      {source.alternative && <span>{t.alternative_source}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </article>
    )
  },
)

const Branch = ({ branch, detailed }: { branch: TrainingBranch; detailed?: boolean }) => {
  const t = useTranslation().pages.recommendations
  const target = branch.target
  const elite = target.elite ?? undefined
  const operatorLevel = target.level ?? undefined
  const trainingSkillLevel = target.skillLevel ?? undefined
  const moduleType = target.module ?? undefined
  const level =
    elite !== undefined && operatorLevel !== undefined
      ? t.elite_level({ elite, level: operatorLevel })
      : elite !== undefined
        ? t.elite_only({ elite })
        : operatorLevel !== undefined
          ? t.level_only({ level: operatorLevel })
          : t.level_unknown
  const skillLevel =
    trainingSkillLevel === undefined
      ? t.unspecified
      : trainingSkillLevel <= 7
        ? t.skill_level({ level: trainingSkillLevel })
        : t.mastery_level({ level: trainingSkillLevel - 7 })
  const module =
    moduleType === undefined
      ? t.module_unknown
      : moduleType === 0
        ? t.module_none
        : t.module_target({ name: getModuleName(moduleType as CopilotDocV1.Module) })
  return (
    <div className="min-w-0 text-sm leading-relaxed">
      <p className="font-semibold mb-1.5">{level}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-slate-300">
        <span>{target.skill > 0 ? t.skill_target({ skill: target.skill, level: skillLevel }) : t.no_skill}</span>
        <span>{module}</span>
      </div>
      {detailed && (
        <>
          <p className="text-xs mt-2 text-zinc-600 dark:text-slate-300">
            {t.branch_share({ share: percent(branch.usageShare), coverage: percent(branch.coverage) })}
          </p>
          <p className="text-xs mt-1 text-zinc-500 dark:text-slate-400">
            {t.completeness({
              level: percent(branch.levelDataRatio),
              skill: percent(branch.skillDataRatio),
              module: percent(branch.moduleDataRatio),
            })}
          </p>
        </>
      )}
    </div>
  )
}
