import { Button, Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtom } from 'jotai'

import { editorAtoms } from '../core/editor-state'
import { LevelMap } from './action/LevelMap'
import { OperatorSheet } from './operator/sheet/OperatorSheet'

export const SelectorPanel = () => {
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
