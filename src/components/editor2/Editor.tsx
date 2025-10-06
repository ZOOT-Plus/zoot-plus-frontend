import clsx from 'clsx'
import { useAtomCallback } from 'jotai/utils'
import { throttle } from 'lodash-es'
import { FC, memo, useCallback, useEffect } from 'react'

import { useCurrentSize } from '../../utils/useCurrenSize'
import { EditorToolbar } from './EditorToolbar'
import { InfoEditor } from './InfoEditor'
import { ActionEditor } from './action/ActionEditor'
import { editorAtoms, historyAtom } from './editor-state'
import { useHistoryControls } from './history'
import { OperatorEditor } from './operator/OperatorEditor'
import { OperatorSidebarFloating } from './operator/OperatorSidebarFloating'
import { useAutosave } from './useAutoSave'
import { Validator } from './validation/Validator'

interface OperationEditorProps {
  subtitle?: string
  submitAction: string
  onSubmit: () => void
}

export const OperationEditor: FC<OperationEditorProps> = memo(
  ({ subtitle, submitAction, onSubmit }) => {
    useAutosave()
    const { isMD } = useCurrentSize()
    const { undo, redo } = useHistoryControls(historyAtom)

    const handleUndoRedo = useAtomCallback(
      useCallback(
        (get, set) => {
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
            if (
              e.inputType === 'historyUndo' ||
              e.inputType === 'historyRedo'
            ) {
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

    return (
      <div className="-mt-14 pt-14 md:h-screen flex flex-col">
        <Validator />
        <EditorToolbar
          subtitle={subtitle}
          submitAction={submitAction}
          onSubmit={onSubmit}
        />
        <div className={clsx('grow min-h-0 relative')}>
          {!isMD && <OperatorSidebarFloating />}
          {isMD ? (
            <div className="panel-shadow">
              <InfoEditor preLevel={(window as any).__editor_preLevel} />
              <OperatorEditor />
              <ActionEditor />
            </div>
          ) : (
            <div className="panel-shadow h-full overflow-auto">
              <InfoEditor preLevel={(window as any).__editor_preLevel} />
              <ActionEditor />
            </div>
          )}
        </div>
      </div>
    )
  },
)
OperationEditor.displayName = 'OperationEditor'
