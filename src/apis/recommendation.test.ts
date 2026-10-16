import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { SWRConfig } from 'swr'
import { afterEach, expect, it, vi } from 'vitest'

import { recommendationParams, RecommendationResult } from '../models/recommendation'
import { NetworkError } from '../utils/error'
import { useRecommendations } from './recommendation'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('tracks activity ownership through failed requests, cached categories, and late responses', async () => {
  const response = (activities: string[]) =>
    new Response(
      JSON.stringify({
        status_code: 200,
        data: {
          generatedAt: '2026-10-15T12:00:00',
          algorithmVersion: 1,
          operationCount: 0,
          familyCount: 0,
          invalidCount: 0,
          categories: ['主题曲', '活动关卡'],
          activities,
          stages: [],
          recommendations: [],
        } satisfies RecommendationResult,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  let resolveCached!: (response: Response) => void
  let resolveCategory!: (response: Response) => void
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response(['第一章']))
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveCached = resolve)))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveCategory = resolve)))
  vi.stubGlobal('fetch', fetchMock)
  const { result, rerender } = renderHook(
    ({ category }) => useRecommendations({ ...recommendationParams(new URLSearchParams()), category }),
    {
      initialProps: { category: '主题曲' },
      wrapper: ({ children }) =>
        createElement(
          SWRConfig,
          {
            value: {
              provider: () => new Map(),
              shouldRetryOnError: false,
              dedupingInterval: 0,
              revalidateOnFocus: false,
            },
          },
          children,
        ),
    },
  )
  await waitFor(() => expect(result.current.activities).toEqual(['第一章']))

  rerender({ category: '活动关卡' })
  expect(result.current.data?.activities).toEqual(['第一章'])
  expect(result.current.activities).toBeUndefined()
  await waitFor(() => expect(result.current.error).toBeInstanceOf(NetworkError))
  expect(result.current.isLoading).toBe(false)
  expect(result.current.activities).toBeUndefined()

  rerender({ category: '主题曲' })
  expect(result.current.activities).toEqual(['第一章'])
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  expect(result.current.isValidating).toBe(true)

  rerender({ category: '活动关卡' })
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
  await act(async () => resolveCached(response(['第一章', '第二章'])))
  expect(result.current.activities).toBeUndefined()
  await act(async () => resolveCategory(response(['新活动'])))
  await waitFor(() => expect(result.current.activities).toEqual(['新活动']))
})

it('aborts a stalled request with a 30-second timeout and allows retrying', async () => {
  const controller = new AbortController()
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(controller.signal)
  const fetchMock = vi.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useRecommendations(recommendationParams(new URLSearchParams())), {
    wrapper: ({ children }) =>
      createElement(SWRConfig, { value: { provider: () => new Map(), shouldRetryOnError: false } }, children),
  })

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  expect(timeout).toHaveBeenCalledWith(30_000)
  expect(result.current.isLoading).toBe(true)
  expect(result.current.error).toBeUndefined()

  act(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')))
  await waitFor(() => expect(result.current.error).toBeInstanceOf(NetworkError))
  expect(result.current.isLoading).toBe(false)
  expect(result.current.data).toBeUndefined()

  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status_code: 200,
        data: {
          generated_at: '2026-10-15T12:00:00',
          algorithm_version: 1,
          operation_count: 0,
          family_count: 0,
          invalid_count: 0,
          categories: [],
          activities: [],
          stages: [],
          recommendations: [],
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  )
  await act(async () => {
    await result.current.mutate()
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(result.current.error).toBeUndefined()
  expect(result.current.data).toMatchObject({ operationCount: 0, recommendations: [] })
})
