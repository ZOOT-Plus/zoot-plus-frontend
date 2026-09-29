import { act, cleanup, renderHook } from '@testing-library/react'
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toaster = vi.hoisted(() => ({ show: vi.fn() }))

vi.mock('../../../Toaster', () => ({
  AppToaster: toaster,
}))

import { createStoreWrapper } from '../../../../../tests/jotai'
import { defaultEditorState, editorAtoms } from '../editor-state'
import {
  AUTO_SAVE_INTERVAL,
  AUTO_SAVE_LIMIT,
  NotChangedError,
  editorArchiveAtom,
  editorSaveAtom,
  useAutosave,
} from '../autosave'

beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function setDocumentTitle(store: ReturnType<typeof createStore>, title: string) {
  store.set(editorAtoms.editor, (state) => ({
    ...state,
    operation: {
      ...state.operation,
      doc: { ...state.operation.doc, title },
    },
  }))
}

describe('editorSaveAtom', () => {
  it('rejects the default state and an unchanged repeat save', () => {
    const store = createStore()
    store.set(editorArchiveAtom, [])
    store.set(editorAtoms.reset)

    expect(() => store.set(editorSaveAtom)).toThrow(NotChangedError)

    setDocumentTitle(store, 'Saved operation')
    store.set(editorSaveAtom)
    expect(() => store.set(editorSaveAtom)).toThrow(NotChangedError)
  })

  it('stores dehydrated state and caps the archive at the save limit', () => {
    const store = createStore()
    const oldRecords = Array.from({ length: AUTO_SAVE_LIMIT }, (_, index) => ({
      v: {
        ...defaultEditorState,
        metadata: { ...defaultEditorState.metadata, videoUrl: `old-${index}` },
      },
      t: index,
    }))
    store.set(editorArchiveAtom, oldRecords)
    store.set(editorAtoms.editor, {
      ...defaultEditorState,
      operation: {
        ...defaultEditorState.operation,
        opers: [{ id: 'editor-only-id', name: 'Saved operator' }],
        doc: { title: 'New operation' },
      },
    })

    store.set(editorSaveAtom)

    const archive = store.get(editorArchiveAtom)
    expect(archive).toHaveLength(AUTO_SAVE_LIMIT)
    expect(archive[0].v.operation.doc.title).toBe('New operation')
    expect(archive[0].v.operation.opers[0]).not.toHaveProperty('id')
    expect(archive.at(-1)?.t).toBe(AUTO_SAVE_LIMIT - 2)
  })
})

describe('useAutosave', () => {
  it('saves on the interval, beforeunload, and unmount, then clears the interval', () => {
    vi.useFakeTimers()
    const store = createStore()
    store.set(editorArchiveAtom, [])
    setDocumentTitle(store, 'Interval save')

    const { unmount } = renderHook(() => useAutosave(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => vi.advanceTimersByTime(AUTO_SAVE_INTERVAL))
    expect(store.get(editorArchiveAtom)).toHaveLength(1)

    setDocumentTitle(store, 'Before unload save')
    act(() => window.dispatchEvent(new Event('beforeunload')))
    expect(store.get(editorArchiveAtom)).toHaveLength(2)

    setDocumentTitle(store, 'Unmount save')
    act(() => unmount())
    expect(store.get(editorArchiveAtom)).toHaveLength(3)

    act(() => vi.advanceTimersByTime(AUTO_SAVE_INTERVAL))
    expect(store.get(editorArchiveAtom)).toHaveLength(3)
  })
})
