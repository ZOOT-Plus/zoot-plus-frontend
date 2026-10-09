import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
afterEach(cleanup)
beforeEach(() =>
  mock.useRecommendations.mockReturnValue({
    data,
    isLoading: false,
    isValidating: false,
    error: undefined,
    mutate: mock.retry,
  }),
)

describe('recommendation filters', () => {
  it('restores validated URL filters and ignores unsupported values', () => {
    expect(
      recommendationParams(new URLSearchParams('scope=HISTORY&days=0&coverage=0.9&closed=1&alternatives=0')),
    ).toMatchObject({ scope: 'HISTORY', days: 0, coverage: 0.9, includeClosed: true, includeAlternatives: false })
    expect(recommendationParams(new URLSearchParams('scope=bad&days=-1&coverage=NaN'))).toMatchObject({
      scope: 'RECENT',
      days: 180,
      coverage: 0.8,
    })
  })

  it('restores filters and updates the server query when scope changes', () => {
    mount('/recommendations?scope=HISTORY&days=0')
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'HISTORY', days: 0 }))
    fireEvent.change(screen.getByLabelText('Use case'), { target: { value: 'PERMANENT' } })
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'PERMANENT' }))
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

  it('searches events, reports no matches, and clears only the selected event', async () => {
    mount('/recommendations?stageId=s1')
    fireEvent.click(screen.getByLabelText('Event or chapter'))
    const input = await screen.findByRole('combobox', { name: 'Search event or chapter names' })
    fireEvent.change(input, { target: { value: 'missing' } })
    await screen.findByText('No matches. Try another search.')
    fireEvent.change(input, { target: { value: '第一' } })
    const option = await screen.findByRole('option', { name: '第一章' })
    fireEvent.click(option.querySelector('a')!)
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: '第一章', stageId: 's1' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear Event or chapter filter' }))
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity: undefined, stageId: 's1' }),
    )
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

  it('filters operators locally without changing the statistical query', () => {
    mount()
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'does-not-exist' } })
    expect(screen.getByText('No recommendations match these filters')).toBeTruthy()
    expect(mock.useRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'RECENT', days: 180 }))
  })
})

describe('recommendation rarity groups', () => {
  it('separates all one to three star operators while preserving each group order and filters', () => {
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
    const higher = screen.getByRole('region', { name: '4 stars and above' })
    const lower = screen.getByRole('region', { name: '3 stars and below' })
    expect(
      within(higher)
        .getAllByRole('article')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(['Exusiai', 'Gummy', 'Ptilopsis'])
    expect(
      within(lower)
        .getAllByRole('article')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(['Hibiscus', 'Lancet-2', 'Durin'])
    expect(screen.getByText('6 operators')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'Medic' } })
    expect(within(screen.getByRole('region', { name: '4 stars and above' })).getAllByRole('article')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: '3 stars and below' })).getAllByRole('article')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Rarity'), { target: { value: '3' } })
    expect(screen.queryByRole('region', { name: '4 stars and above' })).toBeNull()
    expect(within(screen.getByRole('region', { name: '3 stars and below' })).getAllByRole('article')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'Hibiscus' } })
    expect(screen.getByRole('article', { name: 'Hibiscus' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search operators'), { target: { value: 'does-not-exist' } })
    expect(screen.getByText('No recommendations match these filters')).toBeTruthy()
    expect(screen.queryByRole('region', { name: '3 stars and below' })).toBeNull()
  })

  it('paginates both groups independently and resets pagination when filters change', () => {
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
    const higher = screen.getByRole('region', { name: '4 stars and above' })
    const lower = screen.getByRole('region', { name: '3 stars and below' })
    expect(within(higher).getAllByRole('article')).toHaveLength(30)
    expect(within(lower).getAllByRole('article')).toHaveLength(30)
    fireEvent.click(within(higher).getByRole('button', { name: 'Show more' }))
    expect(within(higher).getAllByRole('article')).toHaveLength(31)
    expect(within(lower).getAllByRole('article')).toHaveLength(30)
    fireEvent.click(within(lower).getByRole('button', { name: 'Show more' }))
    expect(within(lower).getAllByRole('article')).toHaveLength(31)
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'Sniper' } })
    expect(within(screen.getByRole('region', { name: '4 stars and above' })).getAllByRole('article')).toHaveLength(30)
    expect(within(screen.getByRole('region', { name: '3 stars and below' })).getAllByRole('article')).toHaveLength(30)
  })
})

describe('recommendation evidence', () => {
  it('shows unknown module type and links to the source without inventing module levels', () => {
    mount()
    expect(screen.getAllByText(/Module unspecified/).length).toBeGreaterThan(0)
    expect(screen.getByText('Source operation').closest('a')?.getAttribute('href')).toBe('/operation/123')
    expect(screen.queryByText(/Module level/)).toBeNull()
    expect(screen.getByText(/100 automatic operations and 10 independent strategies/)).toBeTruthy()
    expect(screen.getByText(/1 other operations lacked/)).toBeTruthy()
  })

  it('provides an actionable retry after an API error', () => {
    mock.useRecommendations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      mutate: mock.retry,
    })
    mount()
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
