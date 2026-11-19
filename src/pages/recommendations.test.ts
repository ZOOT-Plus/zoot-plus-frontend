import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { recommendationParams, RecommendationResult } from '../models/recommendation'
import { RecommendationsPage } from './recommendations'

const mock = vi.hoisted(() => ({ useRecommendations: vi.fn(), retry: vi.fn() }))
vi.mock('apis/recommendation', () => ({ useRecommendations: mock.useRecommendations }))

const data: RecommendationResult = {
  generatedAt: '2026-07-10T12:00:00',
  algorithmVersion: 1,
  operationCount: 100,
  familyCount: 10,
  invalidCount: 1,
  categories: ['主题曲'],
  activities: ['第一章'],
  stages: [{ id: 's1', name: '1-7' }],
  recommendations: [
    {
      operator: { id: 'char_103_angel', name: '能天使', role: 'Sniper', rarity: 6 },
      score: 20,
      stageCount: 3,
      familyCount: 4,
      recentStageCount: 2,
      recentFamilyCount: 3,
      status: 'CURRENT',
      branches: [
        {
          target: { elite: 2, level: 60, skill: 3, skillLevel: 10, module: null },
          usageShare: 1,
          coverage: 0.85,
          levelDataRatio: 1,
          skillDataRatio: 1,
          moduleDataRatio: 0,
        },
      ],
      sources: [
        {
          id: 123,
          title: 'Source operation',
          stageId: 's1',
          firstPublishedAt: '2026-07-01T00:00:00',
          likes: 90,
          dislikes: 10,
          views: 100,
          quality: 0.8,
          alternative: false,
        },
      ],
    },
  ],
}

const mount = (url = '/recommendations') =>
  render(createElement(MemoryRouter, { initialEntries: [url] }, createElement(RecommendationsPage)))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  mock.useRecommendations.mockReturnValue({
    data,
    activities: data.activities,
    isLoading: false,
    isValidating: false,
    error: undefined,
    mutate: mock.retry,
  })
})

describe('recommendation filters', () => {
  it('restores validated URL filters and ignores unsupported values', () => {
    expect(
      recommendationParams(new URLSearchParams('scope=HISTORY&days=0&coverage=0.9&closed=1&alternatives=0')),
    ).toMatchObject({ scope: 'HISTORY', days: 0, coverage: 0.9, includeClosed: true, includeAlternatives: false })
    expect(recommendationParams(new URLSearchParams('scope=bad&days=-1&coverage=NaN'))).toMatchObject({
      scope: 'RECENT',
      days: 180,
      coverage: 0.8,
      minOperationCount: 5,
    })
  })

  it('validates the minimum operation count and passes it to the server', () => {
    for (const value of ['0', '-1', '2', '6', '11', '1.5', 'bad', 'Infinity', '2147483648']) {
      expect(recommendationParams(new URLSearchParams({ minOperationCount: value })).minOperationCount).toBe(5)
    }
    expect(recommendationParams(new URLSearchParams('minOperationCount=1')).minOperationCount).toBe(1)
    mount('/recommendations?minOperationCount=10')
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ minOperationCount: 10 }))
    fireEvent.click(screen.getByRole('button', { name: 'Use case' }))
    fireEvent.click(screen.getByRole('option', { name: 'Permanent stages' }).querySelector('a')!)
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'PERMANENT', minOperationCount: 10 }),
    )
  })

  it('keeps daily filters visible and folds optional settings without losing supported links', () => {
    mount()
    expect(screen.getByRole('button', { name: 'Use case' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stage' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Training target' })).toBeNull()
    expect(screen.getByRole('button', { name: 'More options' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'More options' }))
    expect(screen.getByRole('button', { name: 'Training target' }).textContent).toBe('Practical')
    expect(screen.getByRole('button', { name: 'Recent demand window' }).textContent).toBe('Last 180 days')
    cleanup()
    mount('/recommendations?days=365&coverage=0.9')
    expect(screen.getByRole('button', { name: 'More options' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Training target' }).textContent).toBe('Broad coverage')
  })

  it('normalizes unsupported presets and irrelevant permanent settings in old links', () => {
    expect(recommendationParams(new URLSearchParams('scope=PERMANENT&days=365&closed=1'))).toMatchObject({
      scope: 'PERMANENT',
      days: 180,
      includeClosed: false,
    })
    expect(recommendationParams(new URLSearchParams('scope=HISTORY&days=91&coverage=0.81'))).toMatchObject({
      scope: 'HISTORY',
      days: 0,
      coverage: 0.8,
    })
    expect(recommendationParams(new URLSearchParams('stageId=+s1+&category=+&activity=+第一章+'))).toMatchObject({
      stageId: 's1',
      category: undefined,
      activity: '第一章',
    })
    mount('/recommendations?scope=PERMANENT&coverage=0.9')
    expect(screen.queryByRole('button', { name: 'Recent demand window' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Include closed content' })).toBeNull()
  })

  it('uses server-approved activities independently of the stage count threshold', async () => {
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        activities: ['第一章', '聚合活动'],
        stages: [
          { id: 's1', name: '1-7', category: '主题曲', activity: '第一章' },
          { id: 'rune', name: 'Internal stage', category: '主题曲', activity: 'level_crisis_v2_03-01' },
        ],
      },
      activities: ['第一章', '聚合活动'],
    })
    mount('/recommendations?category=主题曲')
    fireEvent.click(screen.getByLabelText('Event or chapter'))
    await screen.findByRole('option', { name: '聚合活动' })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2)
    expect(screen.queryByRole('option', { name: 'level_crisis_v2_03-01' })).toBeNull()
  })

  it('blocks stale activities until the new category response arrives without hiding previous results', async () => {
    const { useRecommendations } =
      await vi.importActual<typeof import('../apis/recommendation')>('../apis/recommendation')
    mock.useRecommendations.mockImplementation(useRecommendations)
    const response = (activities: string[]) =>
      new Response(
        JSON.stringify({ status_code: 200, data: { ...data, categories: ['主题曲', '活动关卡'], activities } }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    let resolveCategory!: (response: Response) => void
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(['第一章']))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveCategory = resolve)))
      .mockResolvedValue(response(['新活动']))
    vi.stubGlobal('fetch', fetchMock)
    const Location = () => createElement('output', { 'data-testid': 'location' }, useLocation().search)
    render(
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), shouldRetryOnError: false, revalidateOnFocus: false } },
        createElement(
          MemoryRouter,
          { initialEntries: ['/recommendations?category=主题曲&activity=第一章&stageId=s1'] },
          createElement(RecommendationsPage),
          createElement(Location),
        ),
      ),
    )
    await waitFor(() => expect((screen.getByLabelText('Event or chapter') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByLabelText('Event or chapter'))
    await screen.findByRole('option', { name: '第一章' })
    fireEvent.click(screen.getByRole('option', { name: '第一章' }).querySelector('a')!)
    await waitFor(() => expect(screen.queryByRole('option', { name: '第一章' })).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Stage category' }))
    fireEvent.click(screen.getByRole('option', { name: '活动关卡' }).querySelector('a')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const activitySelect = screen.getByLabelText('Event or chapter') as HTMLButtonElement
    expect(activitySelect.disabled).toBe(true)
    fireEvent.click(activitySelect)
    expect(screen.queryByRole('option', { name: '第一章' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Search event or chapter names' })).toBeNull()
    expect(screen.getByRole('article', { name: 'Exusiai' })).toBeTruthy()
    expect(activitySelect.textContent).toBe('All')
    let search = new URLSearchParams(screen.getByTestId('location').textContent!)
    expect(search.get('category')).toBe('活动关卡')
    expect(search.has('activity')).toBe(false)
    expect(search.has('stageId')).toBe(false)

    await act(async () => resolveCategory(response(['新活动'])))
    await waitFor(() => expect(activitySelect.disabled).toBe(false))
    fireEvent.click(activitySelect)
    const option = await screen.findByRole('option', { name: '新活动' })
    expect(screen.queryByRole('option', { name: '第一章' })).toBeNull()
    fireEvent.click(option.querySelector('a')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    search = new URLSearchParams(screen.getByTestId('location').textContent!)
    expect(search.get('category')).toBe('活动关卡')
    expect(search.get('activity')).toBe('新活动')
    expect(
      fetchMock.mock.calls.some(([url]) => {
        const query = new URL(url as string).searchParams
        return query.get('category') === '活动关卡' && query.get('activity') === '第一章'
      }),
    ).toBe(false)
  })

  it.each([
    ['role=bad', 'All', '4+ stars'],
    ['rarity=7', 'All', '4+ stars'],
    ['rarity=6.0', 'All', '4+ stars'],
    ['rarity=6%0A', 'All', '4+ stars'],
    ['role=bad&rarity=6', 'All', '6 stars'],
    ['role=Sniper&rarity=NaN', 'Sniper', '4+ stars'],
  ])('falls back for unsupported local URL filters: %s', (query, role, rarity) => {
    mount(`/recommendations?${query}`)
    expect(screen.getByRole('article', { name: 'Exusiai' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Class' }).textContent).toBe(role)
    expect(screen.getByRole('button', { name: 'Rarity' }).textContent).toBe(rarity)
  })

  it('restores filters and updates the server query when scope changes', () => {
    mount('/recommendations?scope=HISTORY&days=0&category=活动关卡&activity=旧活动&stageId=old&closed=1')
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'HISTORY', days: 0 }))
    fireEvent.click(screen.getByRole('button', { name: 'Use case' }))
    fireEvent.click(screen.getByRole('option', { name: 'Permanent stages' }).querySelector('a')!)
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'PERMANENT',
        days: 180,
        category: undefined,
        activity: undefined,
        stageId: undefined,
        includeClosed: false,
      }),
    )
  })

  it('searches every stage by code and ID while limiting the displayed options', async () => {
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        stages: [
          ...Array.from({ length: 1000 }, (_, index) => ({ id: `stage_${index}`, name: `Other stage ${index}` })),
          { id: 'main_01-07', name: '1-7 Supply' },
          { id: 'main_01-07-hard', name: '1-7 Supply' },
        ],
      },
      isLoading: false,
      mutate: mock.retry,
    })
    mount()
    fireEvent.click(screen.getByLabelText('Stage'))
    const input = await screen.findByRole('combobox', { name: 'Search stage code, name, or ID' })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(50)
    expect(screen.getByText('Showing the first 50 matches. Refine your search.')).toBeTruthy()
    fireEvent.change(input, { target: { value: ' 1-7 supply ' } })
    await waitFor(() => expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2))
    fireEvent.change(input, { target: { value: ' MAIN_01-07-HARD ' } })
    await waitFor(() => expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ stageId: undefined }))
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 })
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })
    await waitFor(() =>
      expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ stageId: 'main_01-07-hard' })),
    )
    expect(screen.getByLabelText('Stage').textContent).toBe('1-7 Supply')
    fireEvent.click(screen.getByRole('button', { name: 'Clear Stage filter' }))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ stageId: undefined }))
  })

  it('excludes stages without matching category and activity metadata from parent filters', async () => {
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        stages: [
          { id: 's1', name: '1-7', category: '主题曲', activity: '第一章' },
          { id: 'no-category', name: 'Missing category', activity: '第一章' },
          { id: 'no-activity', name: 'Missing activity', category: '主题曲' },
          { id: 'no-metadata', name: 'Missing metadata' },
        ],
      },
    })
    mount('/recommendations?category=主题曲&activity=第一章')
    fireEvent.click(screen.getByLabelText('Stage'))
    await screen.findByRole('option', { name: /1-7/ })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
  })

  it('restores selected labels and preserves unavailable URL selections until cleared', () => {
    mount('/recommendations?activity=第一章&stageId=missing-stage')
    expect(screen.getByLabelText('Event or chapter').textContent).toBe('第一章')
    expect(screen.getByLabelText('Stage').textContent).toBe('missing-stage')
    fireEvent.click(screen.getByRole('button', { name: 'Clear Stage filter' }))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: '第一章', stageId: undefined }),
    )
  })

  it('preserves the stage when the activity is unchanged and clears it when the activity is cleared', async () => {
    mount('/recommendations?activity=第一章&stageId=s1')
    fireEvent.click(screen.getByLabelText('Event or chapter'))
    const option = await screen.findByRole('option', { name: '第一章' })
    fireEvent.click(option.querySelector('a')!)
    await waitFor(() => expect(screen.queryByRole('option', { name: '第一章' })).toBeNull())
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: '第一章', stageId: 's1' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear Event or chapter filter' }))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: undefined, stageId: undefined }),
    )
    expect(screen.queryByRole('button', { name: 'Clear Stage filter' })).toBeNull()
  })

  it('limits event and stage choices to their parent filters and clears incompatible selections', async () => {
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        categories: ['主题曲', '活动关卡'],
        activities: ['第一章', '新活动'],
        stages: [
          { id: 's1', name: '1-7', category: '主题曲', activity: '第一章' },
          { id: 's2', name: 'EV-1', category: '活动关卡', activity: '新活动' },
        ],
      },
      activities: ['第一章', '新活动'],
    })
    mount('/recommendations?category=主题曲&activity=第一章&stageId=s1')
    fireEvent.click(screen.getByRole('button', { name: 'Stage category' }))
    fireEvent.click(screen.getByRole('option', { name: '活动关卡' }).querySelector('a')!)
    await waitFor(() => expect(screen.queryByRole('option', { name: '活动关卡' })).toBeNull())
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: '活动关卡', activity: undefined, stageId: undefined }),
    )
    fireEvent.click(screen.getByLabelText('Stage'))
    const stage = await screen.findByRole('option', { name: /EV-1/ })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    fireEvent.click(stage.querySelector('a')!)
    await waitFor(() => expect(screen.queryByRole('option', { name: /EV-1/ })).toBeNull())
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ stageId: 's2' }))
    fireEvent.click(screen.getByLabelText('Event or chapter'))
    const input = await screen.findByRole('combobox', { name: 'Search event or chapter names' })
    fireEvent.change(input, { target: { value: 'missing' } })
    await screen.findByText('No matches. Try another search.')
    fireEvent.change(input, { target: { value: '新' } })
    const option = await screen.findByRole('option', { name: '新活动' })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    fireEvent.click(option.querySelector('a')!)
    await waitFor(() => expect(screen.queryByRole('option', { name: '新活动' })).toBeNull())
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: '新活动', stageId: undefined }),
    )
    fireEvent.click(screen.getByLabelText('Stage'))
    await screen.findByRole('option', { name: /EV-1/ })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Event or chapter filter' }))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: undefined, stageId: undefined }),
    )
  })
})

describe('recommendation rarity filters', () => {
  it('labels the default and exact rarities and shows the result count once', () => {
    const operators = [
      { id: 'char_120_hibisc', name: '芙蓉', role: 'Medic', rarity: 3 },
      { id: 'char_103_angel', name: '能天使', role: 'Sniper', rarity: 6 },
      { id: 'char_285_medic2', name: 'Lancet-2', role: 'Medic', rarity: 1 },
      { id: 'char_196_sunbr', name: '古米', role: 'Tank', rarity: 4 },
      { id: 'char_501_durin', name: '杜林', role: 'Caster', rarity: 2 },
      { id: 'char_128_plosis', name: '白面鸮', role: 'Medic', rarity: 5 },
    ]
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        recommendations: operators.map((operator, index) => ({
          ...data.recommendations[0],
          operator,
          score: 60 - index,
        })),
      },
      isLoading: false,
    })
    mount()
    expect(screen.getAllByRole('article').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Exusiai',
      'Gummy',
      'Ptilopsis',
    ])
    expect(screen.getAllByText('3 operators')).toHaveLength(1)
    expect(screen.getAllByText('4+ stars')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Rarity' }).textContent).toBe('4+ stars')

    for (const [stars, name] of [
      [1, 'Lancet-2'],
      [2, 'Durin'],
      [3, 'Hibiscus'],
      [4, 'Gummy'],
      [5, 'Ptilopsis'],
      [6, 'Exusiai'],
    ] as const) {
      const label = stars === 1 ? '1 star' : `${stars} stars`
      fireEvent.click(screen.getByRole('button', { name: 'Rarity' }))
      fireEvent.click(screen.getByRole('option', { name: label }).querySelector('a')!)
      expect(screen.getByRole('button', { name: 'Rarity' }).textContent).toBe(label)
      expect(screen.getAllByRole('article').map((item) => item.getAttribute('aria-label'))).toEqual([name])
    }
    fireEvent.click(screen.getByRole('button', { name: 'Rarity' }))
    fireEvent.click(screen.getByRole('option', { name: '4+ stars' }).querySelector('a')!)

    fireEvent.click(screen.getByRole('button', { name: 'Class' }))
    fireEvent.click(screen.getByRole('option', { name: 'Medic' }).querySelector('a')!)
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Ptilopsis' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Rarity' }))
    fireEvent.click(screen.getByRole('option', { name: '3 stars' }).querySelector('a')!)
    expect(screen.getAllByRole('article')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'Hibiscus' } })
    expect(screen.getByRole('article', { name: 'Hibiscus' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'does-not-exist' } })
    expect(screen.getByText('No recommendations match these filters')).toBeTruthy()
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('paginates the results and resets pagination when filters change', () => {
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        recommendations: [6, 3].flatMap((rarity) =>
          Array.from({ length: 31 }, (_, index) => ({
            ...data.recommendations[0],
            operator: { ...data.recommendations[0].operator, id: `test-${rarity}-${index}`, rarity },
          })),
        ),
      },
      isLoading: false,
    })
    mount()
    expect(screen.getAllByRole('article')).toHaveLength(30)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getAllByRole('article')).toHaveLength(31)
    fireEvent.click(screen.getByRole('button', { name: 'Rarity' }))
    fireEvent.click(screen.getByRole('option', { name: '3 stars' }).querySelector('a')!)
    expect(screen.getAllByRole('article')).toHaveLength(30)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getAllByRole('article')).toHaveLength(31)
    fireEvent.click(screen.getByRole('button', { name: 'Class' }))
    fireEvent.click(screen.getByRole('option', { name: 'Sniper' }).querySelector('a')!)
    expect(screen.getAllByRole('article')).toHaveLength(30)
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getAllByRole('article')).toHaveLength(30)
    expect(screen.getByRole('button', { name: 'Rarity' }).textContent).toBe('4+ stars')
  })
})

describe('recommendation evidence', () => {
  it('hides branches below 0.5% usage and includes branches at the threshold', async () => {
    const item = data.recommendations[0]
    mock.useRecommendations.mockReturnValue({
      data: {
        ...data,
        recommendations: [
          {
            ...item,
            branches: [0, 0.004999, 0.005, 0.005001].map((usageShare, index) => ({
              ...item.branches[0],
              target: { ...item.branches[0].target, level: 20 + index * 10 },
              usageShare,
            })),
          },
        ],
      },
    })
    mount()
    expect(screen.getByText('E2 Lv.40')).toBeTruthy()
    expect(screen.getByText('2 targets')).toBeTruthy()
    const details = screen.getByRole('article').querySelector('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    await screen.findByText('E2 Lv.50')
    expect(screen.getAllByText('E2 Lv.40')).toHaveLength(2)
    expect(screen.queryByText('E2 Lv.20')).toBeNull()
    expect(screen.queryByText('E2 Lv.30')).toBeNull()
  })

  it('renders sources on expansion and retains the row while searching', async () => {
    mount()
    expect(screen.getAllByText(/Module unspecified/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Source operation')).toBeNull()
    const article = screen.getByRole('article')
    const details = article.querySelector('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    await screen.findByText('Source operation')
    expect(screen.getByText('Source operation').closest('a')?.getAttribute('href')).toBe('/operation/123')
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'Exusiai' } })
    expect(screen.getByRole('article')).toBe(article)
    expect(details.open).toBe(true)
    expect(screen.getByText('Source operation')).toBeTruthy()
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'RECENT', days: 180 }))
    expect(screen.queryByText(/Module level/)).toBeNull()
    expect(screen.getByText(/100 automatic operations and 10 independent strategies/)).toBeTruthy()
    expect(screen.getByText(/1 other operations lacked/)).toBeTruthy()
  })

  it('keeps previous results visible during loading and after a refresh failure', () => {
    mock.useRecommendations.mockReturnValue({ data, isLoading: true, isValidating: true, mutate: mock.retry })
    const view = mount()
    expect(screen.getByRole('article')).toBeTruthy()
    expect(screen.getByText(/Updating recommendations/)).toBeTruthy()
    mock.useRecommendations.mockReturnValue({ data, error: new Error('offline'), mutate: mock.retry })
    view.rerender(createElement(MemoryRouter, {}, createElement(RecommendationsPage)))
    expect(screen.getByRole('article')).toBeTruthy()
    expect(screen.getByText(/Previous results are still shown/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(mock.retry).toHaveBeenCalled()
  })

  it('announces loading while waiting for results', () => {
    mock.useRecommendations.mockReturnValue({
      data: undefined,
      isLoading: true,
      isValidating: true,
      mutate: mock.retry,
    })
    mount()
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading...')
  })
})
