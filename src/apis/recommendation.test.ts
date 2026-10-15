import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { SWRConfig } from 'swr'
import { afterEach, expect, it, vi } from 'vitest'

import { recommendationParams } from '../models/recommendation'
import { NetworkError } from '../utils/error'
import { useRecommendations } from './recommendation'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
