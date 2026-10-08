import { Button, Callout, Checkbox, HTMLSelect, InputGroup, Menu, MenuItem, Spinner, Tag } from '@blueprintjs/core'
import { cloneElement, ReactElement, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useRecommendations } from 'apis/recommendation'
import { OperatorCard } from 'components/OperatorCard'
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
  const [visible, setVisible] = useState(30)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const filterPanelId = useId()
  const patch = (key: string, value: string) => {
    setVisible(30)
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'scope' && value !== 'HISTORY' && next.get('days') === '0') next.delete('days')
        return next
      },
      { replace: true },
    )
  }
  const query = search.get('q')?.trim().toLowerCase() ?? ''
  const role = search.get('role') ?? ''
  const rarity = search.get('rarity') ?? ''
  const recommendations = useMemo(
    () =>
      data?.recommendations.filter((item) => {
        const info = findOperatorById(item.operator.id)
        return (
          (!role || item.operator.role === role) &&
          (!rarity || item.operator.rarity === Number(rarity)) &&
          (!query ||
            [item.operator.name, info?.name_en, info?.alias, info?.alt_name].some((name) =>
              name?.toLowerCase().includes(query),
            ))
        )
      }) ?? [],
    [data, role, rarity, query],
  )

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
            className={`${filtersVisible ? 'grid mt-3 lg:mt-0' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded`}
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
                items={data?.activities.map((activity) => ({ id: activity, name: activity })) ?? []}
                value={params.activity ?? ''}
                onChange={(value) => patch('activity', value)}
                placeholder={t.activity_search}
                label={t.activity}
              />
            </Filter>
            <Filter label={t.stage}>
              <SearchFilter
                items={data?.stages ?? []}
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
              <Button
                minimal
                icon="reset"
                onClick={() => {
                  setSearch({})
                  setVisible(30)
                }}
              >
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
          {error ? (
            <Callout intent="danger" title={t.error}>
              <Button onClick={() => mutate()}>{t.retry}</Button>
            </Callout>
          ) : isLoading ? (
            <output className="block py-16" aria-label={translations.common.loading}>
              <Spinner />
            </output>
          ) : (
            data && (
              <>
                <div className="flex flex-wrap justify-between gap-2 text-sm mb-4" aria-live="polite">
                  <strong>{t.results({ count: recommendations.length })}</strong>
                  <span className="text-zinc-500 dark:text-slate-400">
                    {t.summary({ operations: data.operationCount, families: data.familyCount })}
                  </span>
                </div>
                {recommendations.length === 0 ? (
                  <Callout title={t.empty}>{t.empty_help}</Callout>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-slate-700 border-y border-zinc-200 dark:border-slate-700">
                    {recommendations.slice(0, visible).map((item) => (
                      <RecommendationRow key={item.operator.id} item={item} />
                    ))}
                  </div>
                )}
                {recommendations.length > visible && (
                  <Button className="mt-4" onClick={() => setVisible((value) => value + 30)}>
                    {t.show_more}
                  </Button>
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
            )
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
    <div className="block min-w-0">
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

const RecommendationRow = ({ item }: { item: OperatorRecommendation }) => {
  const t = useTranslation().pages.recommendations
  const name = useLocalizedOperatorName(item.operator.name)
  const primary = item.branches[0]?.target
  return (
    <article className="py-6 min-w-0" aria-label={name}>
      <div className="flex gap-4 sm:gap-6 items-start min-w-0">
        <div className="pt-3 pl-3 shrink-0">
          <OperatorCard
            operator={{
              name: item.operator.name,
              role: item.operator.role,
              skill: primary?.skill,
              requirements: primary
                ? {
                    elite: primary.elite ?? undefined,
                    level: primary.level ?? undefined,
                    skillLevel: primary.skillLevel ?? undefined,
                    module: (primary.module ?? undefined) as CopilotDocV1.Module | undefined,
                  }
                : undefined,
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <h2 className="text-lg font-semibold break-words">{name}</h2>
            <Tag minimal intent={item.status === 'CURRENT' ? 'success' : undefined}>
              {t.status[item.status]}
            </Tag>
          </div>
          {item.branches[0] && <Branch branch={item.branches[0]} />}
          <p className="text-sm mt-3 text-zinc-600 dark:text-slate-300">
            {t.evidence({ stages: item.stageCount, families: item.familyCount })}
          </p>
          <p className="text-xs mt-1 text-zinc-500 dark:text-slate-400">
            {t.recent_evidence({ stages: item.recentStageCount, families: item.recentFamilyCount })}
          </p>
        </div>
      </div>
      <details className="mt-4 min-w-0">
        <summary className="cursor-pointer text-sm font-medium py-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {t.details}
        </summary>
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
        <h3 className="text-sm font-semibold mt-5 mb-2">{t.sources}</h3>
        <ul className="space-y-3">
          {item.sources.map((source) => (
            <li key={source.id} className="text-sm min-w-0">
              <Link to={`/operation/${source.id}`} className="break-words underline underline-offset-2">
                {source.title || `#${source.id}`}
              </Link>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1 text-zinc-500 dark:text-slate-400">
                <span>{source.stageId}</span>
                <time dateTime={source.firstPublishedAt}>{source.firstPublishedAt.slice(0, 10)}</time>
                <span>{t.votes({ likes: source.likes, dislikes: source.dislikes })}</span>
                <span>{t.views({ count: source.views })}</span>
                {source.alternative && <span>{t.alternative_source}</span>}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </article>
  )
}

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
