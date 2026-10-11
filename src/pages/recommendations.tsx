import { Button, Callout, Checkbox, HTMLSelect, InputGroup, Menu, MenuItem, Spinner, Tag } from '@blueprintjs/core'
import { cloneElement, memo, ReactElement, useDeferredValue, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useRecommendations } from 'apis/recommendation'
import { OperatorAvatar } from 'components/OperatorAvatar'
import { Select } from 'components/Select'
import { useTranslation } from 'i18n/i18n'
import { CopilotDocV1 } from 'models/copilot.schema'
import { findOperatorById, getModuleName, useLocalizedOperatorName } from 'models/operator'
import { OperatorRecommendation, TrainingBranch, recommendationParams } from 'models/recommendation'

const ROLES = ['Pioneer', 'Warrior', 'Tank', 'Sniper', 'Caster', 'Medic', 'Support', 'Special'] as const
const percent = (value: number) => Math.round(value * 100)

// Hallmark: Workbench layout, existing Blueprint theme and system typography; no decorative motion.
export const RecommendationsPage = () => {
  const t = useTranslation().pages.recommendations
  const translations = useTranslation()
  const [search, setSearch] = useSearchParams()
  const params = recommendationParams(search)
  const { data, error, isLoading, isValidating, mutate } = useRecommendations(params)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const filterPanelId = useId()
  const patch = (key: string, value: string) => {
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'scope' && value !== 'HISTORY' && next.get('days') === '0') next.delete('days')
        if (key === 'category') {
          next.delete('activity')
          next.delete('stageId')
        }
        if (key === 'activity' && value) next.delete('stageId')
        return next
      },
      { replace: true },
    )
  }
  const query = useDeferredValue(search.get('q')?.trim().toLowerCase() ?? '')
  const role = search.get('role') ?? ''
  const rarity = search.get('rarity') ?? ''
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
            (!rarity || item.operator.rarity === Number(rarity)) &&
            (!query || text.includes(query)),
        )
        .map(({ item }) => item),
    [searchable, role, rarity, query],
  )
  const groups = useMemo(
    () => [
      { id: 'higher', items: recommendations.filter((item) => item.operator.rarity > 3) },
      { id: 'lower', items: recommendations.filter((item) => item.operator.rarity <= 3) },
    ],
    [recommendations],
  )
  const stages = useMemo(
    () =>
      data?.stages.filter(
        (stage) =>
          (!params.category || !stage.category || stage.category === params.category) &&
          (!params.activity || !stage.activity || stage.activity === params.activity),
      ) ?? [],
    [data?.stages, params.category, params.activity],
  )
  const activities = useMemo(() => {
    const names =
      params.category && data?.stages.some((stage) => stage.category)
        ? [
            ...new Set(
              data.stages
                .filter((stage) => stage.category === params.category)
                .map((stage) => stage.activity)
                .filter((value): value is string => !!value),
            ),
          ].sort()
        : (data?.activities ?? [])
    return names.map((name) => ({ id: name, name }))
  }, [data?.activities, data?.stages, params.category])
  const stageNames = useMemo(() => new Map(data?.stages.map((stage) => [stage.id, stage.name])), [data?.stages])
  const filterKey = JSON.stringify([params, query, role, rarity])

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 min-w-0">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 break-words">{t.title}</h1>
        <p className="text-zinc-600 dark:text-slate-300 leading-relaxed">{t.intro}</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 items-start">
        <aside className="lg:sticky lg:top-20 min-w-0" aria-label={t.filters}>
          <Button
            className="lg:!hidden"
            fill
            icon="filter"
            aria-expanded={filtersVisible}
            aria-controls={filterPanelId}
            onClick={() => setFiltersVisible((value) => !value)}
          >
            {t.filters}
          </Button>
          <div
            id={filterPanelId}
            className={`${filtersVisible ? 'grid mt-3 lg:mt-0' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}
          >
            <Filter label={t.scope}>
              <HTMLSelect fill value={params.scope} onChange={(event) => patch('scope', event.target.value)}>
                {(['RECENT', 'PERMANENT', 'HISTORY'] as const).map((scope) => (
                  <option key={scope} value={scope}>
                    {t.scopes[scope]}
                  </option>
                ))}
              </HTMLSelect>
            </Filter>
            <Filter label={t.days}>
              <HTMLSelect fill value={params.days} onChange={(event) => patch('days', event.target.value)}>
                {(params.scope === 'HISTORY' ? [90, 180, 365, 0] : [90, 180, 365]).map((days) => (
                  <option key={days} value={days}>
                    {days ? t.day_count({ count: days }) : t.all_time}
                  </option>
                ))}
              </HTMLSelect>
            </Filter>
            <Filter label={t.coverage}>
              <HTMLSelect fill value={params.coverage} onChange={(event) => patch('coverage', event.target.value)}>
                <option value={0.6}>{t.basic}</option>
                <option value={0.8}>{t.practical}</option>
                <option value={0.9}>{t.extensive}</option>
              </HTMLSelect>
            </Filter>
            <Filter label={t.category}>
              <HTMLSelect
                fill
                value={params.category ?? ''}
                onChange={(event) => patch('category', event.target.value)}
              >
                <option value="">{t.all}</option>
                {data?.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </HTMLSelect>
            </Filter>
            <Filter label={t.activity}>
              <SearchFilter
                items={activities}
                value={params.activity ?? ''}
                onChange={(value) => patch('activity', value)}
                placeholder={t.activity_search}
                label={t.activity}
              />
            </Filter>
            <Filter label={t.stage}>
              <SearchFilter
                items={stages}
                value={params.stageId ?? ''}
                onChange={(value) => patch('stageId', value)}
                placeholder={t.stage_search}
                label={t.stage}
              />
            </Filter>
            <div className="sm:col-span-2 lg:col-span-1 pt-2">
              <Checkbox
                checked={params.includeAlternatives}
                onChange={(event) => patch('alternatives', event.currentTarget.checked ? '' : '0')}
              >
                {t.alternatives}
              </Checkbox>
              <Checkbox
                checked={params.includeClosed}
                onChange={(event) => patch('closed', event.currentTarget.checked ? '1' : '')}
              >
                {t.closed}
              </Checkbox>
              <Checkbox
                checked={params.includeUncertain}
                onChange={(event) => patch('uncertain', event.currentTarget.checked ? '1' : '')}
              >
                {t.uncertain}
              </Checkbox>
              <Button minimal icon="reset" onClick={() => setSearch({})}>
                {t.reset}
              </Button>
            </div>
          </div>
        </aside>
        <section className="min-w-0" aria-label={t.title} aria-busy={isValidating}>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="flex-1 min-w-0 basis-44">
              <Filter label={t.search}>
                <InputGroup
                  value={search.get('q') ?? ''}
                  onChange={(event) => patch('q', event.target.value)}
                  leftIcon="search"
                />
              </Filter>
            </div>
            <Filter label={t.profession}>
              <HTMLSelect value={role} onChange={(event) => patch('role', event.target.value)}>
                <option value="">{t.all}</option>
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {translations.models.operator.role[value]}
                  </option>
                ))}
              </HTMLSelect>
            </Filter>
            <Filter label={t.rarity}>
              <HTMLSelect value={rarity} onChange={(event) => patch('rarity', event.target.value)}>
                <option value="">{t.all}</option>
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {t.stars({ count: value })}
                  </option>
                ))}
              </HTMLSelect>
            </Filter>
          </div>
          <p className="text-sm text-zinc-600 dark:text-slate-300 mb-5 leading-relaxed">{t.note}</p>
          {error && (
            <Callout className="mb-4" intent="danger" title={t.error}>
              {data && <p className="mb-2">{t.previous_results}</p>}
              <Button onClick={() => mutate()}>{t.retry}</Button>
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
              <div className="flex flex-wrap justify-between gap-2 text-sm mb-4" aria-live="polite">
                <strong>{t.results({ count: recommendations.length })}</strong>
                <span className="text-zinc-500 dark:text-slate-400">
                  {t.summary({ operations: data.operationCount, families: data.familyCount })}
                </span>
              </div>
              {recommendations.length === 0 ? (
                <Callout title={t.empty}>{t.empty_help}</Callout>
              ) : (
                <div className="space-y-8">
                  {groups
                    .filter((group) => group.items.length > 0)
                    .map((group) => (
                      <RecommendationGroup
                        key={group.id}
                        title={group.id === 'higher' ? t.four_stars_and_above : t.three_stars_and_below}
                        items={group.items}
                        filterKey={filterKey}
                        stageNames={stageNames}
                      />
                    ))}
                </div>
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
    <div className="block min-w-0 [&_input]:!h-11 [&_select]:!h-11 [&_.bp6-input-group>.bp6-icon]:!my-3.5">
      <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      {cloneElement(children, { id, 'aria-labelledby': `${id}-label` })}
    </div>
  )
}

// Hallmark · component: searchable filter · theme: existing Blueprint · states: default, focus, empty, selected.
const SearchFilter = ({
  items,
  value,
  onChange,
  placeholder,
  label,
  ...buttonProps
}: {
  items: { id: string; name: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  id?: string
  'aria-labelledby'?: string
}) => {
  const t = useTranslation().pages.recommendations
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/)
    return items.filter((item) => words.every((word) => `${item.name} ${item.id}`.toLowerCase().includes(word)))
  }, [items, query])
  const selected = value ? (items.find((item) => item.id === value) ?? { id: value, name: value }) : undefined
  return (
    <Select
      fill
      className="!flex w-full min-w-0 [&>.bp6-select]:min-w-0 [&>.bp6-select]:flex-1"
      items={items}
      itemsEqual="id"
      query={query}
      onQueryChange={setQuery}
      itemListPredicate={() => matches.slice(0, 50)}
      selectedItem={selected}
      onReset={() => onChange('')}
      resetButtonProps={{ 'aria-label': t.clear_filter({ filter: label }), className: '!min-h-11 !min-w-11' }}
      resetOnClose
      resetOnSelect
      onItemSelect={(item) => onChange(item.id)}
      inputProps={{ placeholder, 'aria-label': placeholder }}
      popoverProps={{ minimal: true, matchTargetWidth: true }}
      itemListRenderer={({ filteredItems, renderItem, itemsParentRef, menuProps }) => (
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Blueprint QueryList requires a Menu listbox for keyboard navigation.
        <Menu {...menuProps} role="listbox" ulRef={itemsParentRef} className="max-h-64 overflow-y-auto">
          {(matches.length === 0 || matches.length > 50) && (
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
          active={modifiers.active}
          selected={item.id === value}
          onClick={handleClick}
          onFocus={handleFocus}
          className="!min-h-11"
          htmlTitle={`${item.name || item.id}${item.name && item.name !== item.id ? ` · ${item.id}` : ''}`}
          text={
            <>
              <div className="truncate">{item.name || item.id}</div>
              {item.name && item.name !== item.id && (
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
        alignText="left"
        rightIcon="chevron-down"
        title={selected?.name || value || t.all}
        className="!min-h-11 [&_.bp6-button-text]:truncate"
      >
        {selected?.name || value || t.all}
      </Button>
    </Select>
  )
}

const RecommendationGroup = ({
  title,
  items,
  filterKey,
  stageNames,
}: {
  title: string
  items: OperatorRecommendation[]
  filterKey: string
  stageNames: Map<string, string>
}) => {
  const t = useTranslation().pages.recommendations
  const headingId = useId()
  const [pagination, setPagination] = useState({ key: filterKey, visible: 30 })
  const visible = pagination.key === filterKey ? pagination.visible : 30
  if (pagination.key !== filterKey) setPagination({ key: filterKey, visible: 30 })
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 id={headingId} className="text-lg font-semibold break-words">
          {title}
        </h2>
        <span className="text-sm text-zinc-500 dark:text-slate-400">{t.results({ count: items.length })}</span>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-slate-700 border-y border-zinc-200 dark:border-slate-700">
        {items.slice(0, visible).map((item) => (
          <RecommendationRow key={item.operator.id} item={item} stageNames={stageNames} />
        ))}
      </div>
      {items.length > visible && (
        <Button className="mt-4 !min-h-11" onClick={() => setPagination({ key: filterKey, visible: visible + 30 })}>
          {t.show_more}
        </Button>
      )}
    </section>
  )
}

const RecommendationRow = memo(
  ({ item, stageNames }: { item: OperatorRecommendation; stageNames: Map<string, string> }) => {
    const translations = useTranslation()
    const t = translations.pages.recommendations
    const name = useLocalizedOperatorName(item.operator.name)
    const [expanded, setExpanded] = useState(false)
    return (
      <article className="py-6 min-w-0" aria-label={name}>
        <div className="flex gap-4 sm:gap-5 items-start min-w-0">
          <OperatorAvatar
            id={item.operator.id}
            rarity={item.operator.rarity}
            fallback={name}
            sourceSize={96}
            className="!w-14 !h-14 sm:!w-16 sm:!h-16 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <h3 className="text-lg font-semibold break-words">{name}</h3>
              <Tag minimal intent={item.status === 'CURRENT' ? 'success' : undefined}>
                {t.status[item.status]}
              </Tag>
            </div>
            <p className="text-xs mb-3 text-zinc-500 dark:text-slate-400">
              {translations.models.operator.role[
                item.operator.role as keyof typeof translations.models.operator.role
              ] ?? item.operator.role}
              {' · '}
              {t.stars({ count: item.operator.rarity })}
            </p>
            {item.branches[0] && <Branch branch={item.branches[0]} />}
            <p className="text-sm mt-3 text-zinc-600 dark:text-slate-300">
              {t.evidence({ stages: item.stageCount, families: item.familyCount })}
            </p>
          </div>
        </div>
        <details className="mt-3 min-w-0" onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-medium py-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            {t.details}
            {item.branches.length > 1 && (
              <span className="ml-2 text-xs text-zinc-500 dark:text-slate-400">
                {t.target_count({ count: item.branches.length })}
              </span>
            )}
          </summary>
          {expanded && (
            <>
              <p className="text-xs mt-1 text-zinc-500 dark:text-slate-400">
                {t.recent_evidence({ stages: item.recentStageCount, families: item.recentFamilyCount })}
              </p>
              <div className="grid gap-3 mt-2 sm:grid-cols-2">
                {item.branches.map((branch, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded min-w-0"
                  >
                    <Branch branch={branch} detailed />
                  </div>
                ))}
              </div>
              <h4 className="text-sm font-semibold mt-5 mb-2">{t.sources}</h4>
              <ul className="space-y-3">
                {item.sources.map((source) => (
                  <li key={source.id} className="text-sm min-w-0">
                    <Link to={`/operation/${source.id}`} className="break-words underline underline-offset-2">
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
            </>
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
      <p className="font-medium">{level}</p>
      <p>
        {target.skill > 0 ? t.skill_target({ skill: target.skill, level: skillLevel }) : t.no_skill} · {module}
      </p>
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
