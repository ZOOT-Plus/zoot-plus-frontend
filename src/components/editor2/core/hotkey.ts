import { useAtomCallback } from 'jotai/utils'
import { throttle } from 'lodash-es'
import { useCallback, useEffect } from 'react'

import { editorAtoms, historyAtom } from './editor-state'
import { useHistoryControls } from './history'

export function useEditorHistoryKeyboard() {
  const { undo, redo } = useHistoryControls(historyAtom)
  const handleUndoRedo = useAtomCallback(
    useCallback(
      (get) => {
        const shouldUseNativeUndo = () => {
          return get(editorAtoms.sourceEditorIsOpen)
        }
        const throttledUndo = throttle(undo, 100)
        const throttledRedo = throttle(redo, 100)
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
            if (shouldUseNativeUndo()) {
              return
            }
            if (e.shiftKey) {
              throttledRedo()
            } else {
              throttledUndo()
            }
            e.preventDefault()
          }
        }
        const onBeforeInput = (e: InputEvent) => {
          if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
            if (!shouldUseNativeUndo()) {
              e.preventDefault()
            }
          }
        }
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('beforeinput', onBeforeInput, {
          capture: true,
        })
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('beforeinput', onBeforeInput, {
            capture: true,
          })
        }
      },
      [undo, redo],
    ),
  )

  useEffect(() => {
    return handleUndoRedo()
  }, [handleUndoRedo])
}
