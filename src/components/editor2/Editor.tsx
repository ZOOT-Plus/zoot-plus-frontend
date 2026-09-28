import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { FC, memo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

import { CopilotType } from '../../models/operation'
import { useCurrentSize } from '../../utils/useCurrenSize'
import { useAutosave } from './core/autosave'
import { editorAtoms } from './core/editor-state'
import { useEditorHistoryKeyboard } from './core/hotkey'
import { ActionEditor } from './ui/action/ActionEditor'
import { EditorToolbar } from './ui/EditorToolbar'
import { InfoEditor } from './ui/info/InfoEditor'
import { OperatorEditor } from './ui/operator/OperatorEditor'
import { SelectorPanel } from './ui/SelectorPanel'
import { Validator } from './ui/Validator'

interface OperationEditorProps {
  subtitle?: string
  submitAction: string
  onSubmit: () => void
}

export const OperationEditor: FC<OperationEditorProps> = memo(({ subtitle, submitAction, onSubmit }) => {
  useAutosave()
  useEditorHistoryKeyboard()
  const { isMD } = useCurrentSize()
  const metadata = useAtomValue(editorAtoms.metadata)
  const isVideo = metadata.type === CopilotType.VIDEO

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
