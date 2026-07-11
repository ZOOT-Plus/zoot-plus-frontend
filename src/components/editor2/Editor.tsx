import { Button, Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { useAtomValue } from 'jotai'
import { throttle } from 'lodash-es'
import { FC, memo, useCallback, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

import { useCurrentSize } from '../../utils/useCurrenSize'
import { CopilotType } from '../../models/operation'
import { EditorToolbar } from './EditorToolbar'
import { InfoEditor } from './InfoEditor'
import { ActionEditor } from './action/ActionEditor'
import { LevelMap } from './action/LevelMap'
import { editorAtoms, historyAtom } from './editor-state'
import { useHistoryControls } from './history'
import { OperatorEditor } from './operator/OperatorEditor'
import { OperatorSheet } from './operator/sheet/OperatorSheet'
import { useAutosave } from './useAutoSave'
import { Validator } from './validation/Validator'

interface OperationEditorProps {
  subtitle?: string
  submitAction: string
  onSubmit: () => void
}

export const OperationEditor: FC<OperationEditorProps> = memo(({ subtitle, submitAction, onSubmit }) => {
  useAutosave()
  const { isMD } = useCurrentSize()
  const { undo, redo } = useHistoryControls(historyAtom)
  const metadata = useAtomValue(editorAtoms.metadata)
  const isVideo = metadata.type === CopilotType.VIDEO

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

  return (
    <div className="-mt-14 pt-14 md:h-screen flex flex-col">
      <Validator />
      <EditorToolbar subtitle={subtitle} submitAction={submitAction} onSubmit={onSubmit} />
      <div className={clsx('grow min-h-0')}>
        {isMD ? (
          <div className="panel-shadow">
            <InfoEditor />
            <OperatorEditor />
            {!isVideo && <ActionEditor />}
          </div>
        ) : (
          <PanelGroup autoSaveId="editor-h" direction="horizontal">
            <Panel>
              <PanelGroup autoSaveId="editor-v-l" direction="vertical">
                <Panel className="panel-shadow relative">
                  <SelectorPanel />
                </Panel>
                <PanelResizeHandle className="h-1 bg-white dark:bg-[#383e47]" />
                <Panel className="panel-shadow">
                  <OperatorEditor />
                </Panel>
              </PanelGroup>
            </Panel>
            <PanelResizeHandle className="w-1 bg-white dark:bg-[#383e47]" />
            <Panel className="panel-shadow">
              {/* we need a wrapper here because the panel cannot be scrollable, or else the shadow will scroll as well */}
              <div className="h-full overflow-auto">
                <InfoEditor />
                {!isVideo && <ActionEditor />}
              </div>
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  )
})
OperationEditor.displayName = 'OperationEditor'

const SelectorPanel = () => {
  const [mode, setMode] = useAtom(editorAtoms.selectorPanelMode)

  return (
    <>
      <div
        className={clsx(
          'absolute z-10 left-0 top-0 flex rounded-lg shadow text-gray-200 transition-[background-position] [background-size:150%] bg-[linear-gradient(90deg,currentColor_0%,currentColor_33%,#a855f7_33%,#a855f7_66%,currentColor_66%,currentColor_100%)]',
          mode === 'operator' && '[background-position:100%]',
        )}
      >
        <Button
          minimal
          icon={<Icon icon="people" size={14} className={clsx(mode === 'operator' && '!text-white')} />}
          className="!p-0 min-w-6 min-h-6"
          onClick={() => setMode('operator')}
        />
        <Button
          minimal
          icon={<Icon icon="area-of-interest" size={14} className={clsx(mode === 'map' && '!text-white')} />}
          className="!p-0 min-w-6 min-h-6"
          onClick={() => setMode('map')}
        />
      </div>

      <div className={clsx('absolute inset-0', mode !== 'operator' && 'invisible')}>
        <OperatorSheet />
      </div>
      <div className={clsx('absolute inset-0', mode !== 'map' && 'invisible')}>
        <LevelMap className="h-full" />
      </div>
    </>
  )
}
