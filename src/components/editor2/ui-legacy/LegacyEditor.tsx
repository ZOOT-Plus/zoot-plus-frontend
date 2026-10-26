import { useAtomValue } from 'jotai'
import { FC, useEffect } from 'react'

import { useLevels } from '../../../apis/level'
import { findLevelByStageName } from '../../../models/level'
import { CopilotType } from '../../../models/operation'
import { useBreakpoint } from '../../../utils/device'
import { editorAtoms } from '../core/editor-state'
import { LegacyActionEditor } from './LegacyActionEditor'
import { LegacyFloatingMap } from './LegacyFloatingMap'
import { LegacyFloatingMapContext, useLegacyFloatingMap } from './LegacyFloatingMapContext'
import { LegacyInfoEditor } from './LegacyInfoEditor'
import { LegacyPerformerEditor } from './LegacyPerformerEditor'

export const LegacyEditor: FC = () => (
  <LegacyFloatingMapContext>
    <LegacyEditorBody />
    <LegacyFloatingMapBreakpoint />
  </LegacyFloatingMapContext>
)

const LegacyFloatingMapBreakpoint: FC = () => {
  const breakpoint = useBreakpoint()
  return breakpoint === 'tablet' ? null : <LegacyFloatingMap />
}

const LegacyEditorBody: FC = () => {
  const metadata = useAtomValue(editorAtoms.metadata)
  const operationBase = useAtomValue(editorAtoms.operationBase)
  const { data: levels } = useLevels()
  const { setLevel } = useLegacyFloatingMap()

  useEffect(() => {
    setLevel(operationBase.stageName ? findLevelByStageName(levels, operationBase.stageName) : undefined)
  }, [levels, operationBase.stageName, setLevel])

  const isVideo = metadata.type === CopilotType.VIDEO

  return (
    <div className="h-full min-h-0 panel-shadow">
      <div className="h-full overflow-y-auto">
        <LegacyInfoEditor />
        <div className="mx-8 my-4 h-px bg-gray-200 dark:bg-gray-600" />
        <LegacyPerformerEditor />
        {!isVideo && <LegacyActionEditor />}
      </div>
    </div>
  )
}
