import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../i18n/i18n'
import type { OperationSet } from '../../models/operation-set'
import { OperationSetEditorDialog } from './OperationSetEditor'

const api = vi.hoisted(() => ({ query: vi.fn(), update: vi.fn(), create: vi.fn() }))

vi.mock('utils/zoot-plus-client', () => ({
  OperationApi: class {
    queriesCopilot = api.query
  },
}))

vi.mock('apis/operation-set', () => ({
  updateOperationSet: api.update,
  createOperationSet: api.create,
  useRefreshOperationSet: () => vi.fn(),
  useRefreshOperationSets: () => vi.fn(),
}))

vi.mock('../../apis/level', () => ({
  useLevels: () => ({ data: [], isLoading: false }),
}))

vi.mock('components/Toaster', () => ({ AppToaster: { show: vi.fn() } }))

interface Query {
  copilotIds: number[]
  page: number
  limit: number
}

function pageResponse(ids: number[], { page, limit }: Query) {
  const sortedIds = [...ids].sort((a, b) => b - a)
  const pageIds = sortedIds.slice((page - 1) * limit, page * limit)
  return {
    data: {
      data: pageIds.map((id) => ({
        id,
        content: JSON.stringify({
          version: 3,
          doc: { title: `Job ${id}`, details: '' },
          stage_name: '1-7',
          minimum_required: 'v4.0.0',
        }),
      })),
      hasNext: pageIds.length >= limit,
      total: ids.length,
    },
  }
}

function openEditor(ids: number[], isOpen = true) {
  const operationSet = {
    id: 1,
    name: 'My collection',
    description: '',
    status: 'PRIVATE',
    copilotIds: ids,
  } as OperationSet
  const cache = new Map()
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      SWRConfig,
      {
        value: {
          provider: () => cache,
          dedupingInterval: 0,
          shouldRetryOnError: false,
          revalidateOnFocus: false,
        },
      },
      children,
    )
  const editor = (copilotIds: number[], open: boolean) =>
    createElement(OperationSetEditorDialog, {
      isOpen: open,
      operationSet: { ...operationSet, copilotIds },
      onClose: vi.fn(),
    })
  const result = render(editor(ids, isOpen), {
    wrapper,
  })
  return {
    ...result,
    refreshMembership: (copilotIds: number[]) => result.rerender(editor(copilotIds, true)),
  }
}

async function save() {
  fireEvent.click(screen.getByRole('button', { name: i18n.components.operationSet.OperationSetEditor.save }))
  await waitFor(() => expect(api.update).toHaveBeenCalledOnce())
  return api.update.mock.calls[0][0].copilotIds
}

beforeEach(() => {
  vi.clearAllMocks()
  api.update.mockResolvedValue(undefined)
  api.create.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('operation set membership editing', () => {
  it('does not request job details for a closed dialog', async () => {
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse(query.copilotIds, query)))
    openEditor(
      Array.from({ length: 60 }, (_, index) => index + 1),
      false,
    )

    await act(async () => undefined)
    expect(api.query).not.toHaveBeenCalled()
  })

  it.each([{ ids: [2, 3, 4] }, { ids: [2, 3, 4, 5] }])(
    'uses refreshed membership $ids without losing local edits',
    async ({ ids: refreshedIds }) => {
      api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse(query.copilotIds, query)))
      const editor = openEditor([1, 2, 3])
      await screen.findByText('Job 1')
      fireEvent.click(
        screen.getByRole('button', { name: i18n.components.operationSet.OperationSetEditor.reverse_list }),
      )
      fireEvent.click(screen.getByRole('checkbox', { name: /^2:/ }))

      editor.refreshMembership(refreshedIds)
      await screen.findByText('Job 4')

      expect(await save()).toEqual([3, ...refreshedIds.filter((id) => id > 3)])
    },
  )

  it.each([50, 51, 60, 100])('loads all pages and preserves the original order of %s jobs', async (count) => {
    const ids = Array.from({ length: count }, (_, index) => index + 1)
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse(ids, query)))
    openEditor(ids)

    await screen.findByText('Job 1')
    await waitFor(() =>
      expect(screen.queryAllByText(i18n.components.operationSet.OperationSetEditor.loading)).toHaveLength(0),
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(count + 1)
    expect(api.query.mock.calls.map(([query]) => query.page)).toEqual(
      Array.from({ length: Math.floor(count / 50) + 1 }, (_, index) => index + 1),
    )
    expect(api.query.mock.calls.every(([query]) => query.limit <= 50)).toBe(true)
    expect(await save()).toEqual(ids)
  })

  it('preserves all ids when saving metadata before details have loaded', async () => {
    const ids = [3, 1, 2]
    let resolve!: (value: ReturnType<typeof pageResponse>) => void
    api.query.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    openEditor(ids)

    expect(await save()).toEqual(ids)
    await act(async () => resolve(pageResponse(ids, { copilotIds: ids, page: 1, limit: 50 })))
  })

  it('preserves all 60 ids when saving after the first page', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => index + 1)
    let resolveSecond: ((value: ReturnType<typeof pageResponse>) => void) | undefined
    api.query.mockImplementation((query: Query) =>
      query.page === 1
        ? Promise.resolve(pageResponse(ids, query))
        : new Promise((resolve) => {
            resolveSecond = resolve
          }),
    )
    openEditor(ids)
    await screen.findByText('Job 60')

    expect(await save()).toEqual(ids)
    await act(async () => resolveSecond?.(pageResponse(ids, { copilotIds: ids, page: 2, limit: 50 })))
  })

  it('preserves all ids after a request fails', async () => {
    api.query.mockRejectedValue(new Error('Details request failed'))
    openEditor([3, 1, 2])

    await screen.findByText('Details request failed')
    expect(await save()).toEqual([3, 1, 2])
  })

  it('retains unavailable jobs unless the user explicitly removes them', async () => {
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse([1, 3], query)))
    openEditor([1, 2, 3])

    await screen.findByText('Job 1')
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(await save()).toEqual([1, 2, 3])
  })

  it('can explicitly remove a job whose details are unavailable', async () => {
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse([1, 3], query)))
    openEditor([1, 2, 3])

    await screen.findByText('Job 1')
    fireEvent.click(screen.getByRole('checkbox', { name: /^2:/ }))
    expect(await save()).toEqual([1, 3])
  })

  it('keeps edits made while the next page is loading', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => index + 1)
    let resolveSecond!: (value: ReturnType<typeof pageResponse>) => void
    api.query.mockImplementation((query: Query) =>
      query.page === 1
        ? Promise.resolve(pageResponse(ids, query))
        : new Promise((resolve) => {
            resolveSecond = resolve
          }),
    )
    openEditor(ids)

    await waitFor(() => expect(api.query).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: i18n.components.operationSet.OperationSetEditor.reverse_list }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^60:/ }))
    await act(async () => resolveSecond(pageResponse(ids, { copilotIds: ids, page: 2, limit: 50 })))
    await screen.findByText('Job 1')

    expect(await save()).toEqual([...ids].reverse().filter((id) => id !== 60))
  })

  it('preserves the remaining ids if a later page fails', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => index + 1)
    api.query.mockImplementation((query: Query) =>
      query.page === 1 ? Promise.resolve(pageResponse(ids, query)) : Promise.reject(new Error('Second page failed')),
    )
    openEditor(ids)

    await screen.findByText('Second page failed')
    fireEvent.click(screen.getByRole('checkbox', { name: /^60:/ }))
    expect(await save()).toEqual(ids.filter((id) => id !== 60))
  })

  it('allows intentionally removing every job', async () => {
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse([1], query)))
    openEditor([1])

    await screen.findByText('Job 1')
    fireEvent.click(screen.getByRole('checkbox', { name: /^1:/ }))
    expect(await save()).toEqual([])
  })

  it.each(['sort_by_title', 'sort_by_id'] as const)('preserves unavailable ids when using %s', async (sortKey) => {
    api.query.mockImplementation((query: Query) => Promise.resolve(pageResponse([1, 2], query)))
    openEditor([2, 99, 1])
    await screen.findByText('Job 1')
    const t = i18n.components.operationSet.OperationSetEditor
    fireEvent.click(screen.getByRole('button', { name: t.quick_sort + '...' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: t[sortKey] }))

    expect(await save()).toEqual([1, 2, 99])
  })
})
