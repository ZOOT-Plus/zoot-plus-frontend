import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Operation } from '../models/operation'
import { NeoOperationCard, OperationCard } from './OperationCard'

vi.mock('../apis/level', () => ({ useLevels: () => ({ data: [] }) }))
vi.mock('services/operation', () => ({ copyShortCode: vi.fn(), handleLazyDownloadJSON: vi.fn() }))
vi.mock('components/operation-set/AddToOperationSet', () => ({ AddToOperationSetButton: () => null }))
vi.mock('components/viewer/OperationRating', () => ({ OperationRating: () => null }))
vi.mock('./UserName', () => ({ UserName: ({ children }: PropsWithChildren) => createElement('span', null, children) }))

afterEach(cleanup)

describe.each([
  ['list', OperationCard],
  ['grid', NeoOperationCard],
] as const)('%s operation card', (_layout, Card) => {
  it.each([0, 1, 2, 3, undefined])('formats grouped skill %s without inventing skill zero', async (skill) => {
    const operation = {
      id: 1,
      type: 'PRTS',
      views: 0,
      uploadTime: new Date('2026-01-01T00:00:00Z'),
      uploaderId: '1',
      uploader: 'Author',
      parsedContent: {
        doc: { title: 'Example', details: '' },
        stageName: '1-7',
        opers: [{ name: 'Solo operator', skill }],
        groups: [{ name: 'Squad', opers: [{ name: 'Grouped operator', skill }] }],
      },
    } as Operation
    render(
      createElement(
        MemoryRouter,
        {
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        createElement(Card, { operation }),
      ),
    )

    expect(screen.getByText(`Solo operator${skill ? ' ' + skill : ''}`)).toBeTruthy()
    fireEvent.mouseEnter(screen.getByText('[Squad]'))

    const expectedLabel = `Grouped operator${skill === 0 ? '' : ' ' + (skill ?? 1)}`
    expect(await screen.findByText(expectedLabel)).toBeTruthy()
    expect(screen.queryByText('Grouped operator 0')).toBeNull()
  })
})
