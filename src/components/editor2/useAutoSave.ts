import { atom, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { first, noop } from 'lodash-es'
import { useEffect } from 'react'

import { i18n } from '../../i18n/i18n'
import { formatError } from '../../utils/error'
import { AppToaster } from '../Toaster'
import { EditorState, defaultEditorState, editorAtoms } from './editor-state'
import { dehydrateOperation } from './reconciliation'

type Archive = Record[]

interface Record {
  /** Value */
  v: EditorState
  /** Time */
  t: number
}

export const AUTO_SAVE_INTERVAL = 1000 * 60 * 5 // 5 minute
export const AUTO_SAVE_LIMIT = 10

export class NotChangedError extends Error {
  constructor() {
    super('Editor state has not changed since last save')
    this.name = 'NotChangedError'
  }
}

const defaultEditorStateStringified = JSON.stringify(defaultEditorState)

export const editorArchiveAtom = atomWithStorage('maa-copilot-editor2-autosave', [] as Archive)
export const editorSaveAtom = atom(noop, (get, set) => {
  const state = get(editorAtoms.editor)
  const dehydratedState = {
    ...state,
    operation: dehydrateOperation(state.operation),
  }

  // this will drop undefined properties but we don't care
  const stringifiedState = JSON.stringify(dehydratedState)

  if (stringifiedState === defaultEditorStateStringified) {
    throw new NotChangedError()
  }

  const records = get(editorArchiveAtom)
  const latestRecord = first(records)

  if (latestRecord && JSON.stringify(latestRecord.v) === stringifiedState) {
    throw new NotChangedError()
  }

  const finalState: EditorState = JSON.parse(stringifiedState)
  const record: Record = {
    v: finalState,
    t: Date.now(),
  }
  const newArchive = [record, ...records].slice(0, AUTO_SAVE_LIMIT)

  while (newArchive.length > 0) {
    try {
      set(editorArchiveAtom, newArchive)
      break
    } catch (e) {
      // drop oldest record in case of reaching localStorage capacity
      newArchive.pop()

      if (newArchive.length === 0) {
        throw e
      }
    }
  }
})

export function useAutosave() {
  const save = useSetAtom(editorSaveAtom)

  useEffect(() => {
    window.addEventListener('beforeunload', save)

    const timer = setInterval(() => {
      try {
        save()
      } catch (e) {
        if (!e || !(e instanceof NotChangedError)) {
          AppToaster.show({
            intent: 'danger',
            message: i18n.components.editor2.misc.autosave_error({
              error: formatError(e),
            }),
          })
        }
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      try {
        // also trigger save on unmount
        save()

        clearInterval(timer)
        window.removeEventListener('beforeunload', save)
      } catch (e) {
        if (!e || !(e instanceof NotChangedError)) {
          console.warn('Failed to save on unmount: ', e)
        }
      }
    }
  }, [save])
}
