import { NonIdealState, Spinner } from '@blueprintjs/core'

import clsx from 'clsx'
import { produce } from 'immer'
import { Getter, atom, useAtom, useAtomValue } from 'jotai'
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react'

import { useLevels } from '../../../apis/level'
import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { findLevelByStageName } from '../../../models/level'
import { sendMessage, useMessage } from '../../../utils/messenger'
import {
  CheckMapMessage,
  MAP_ORIGIN,
  MapReadyMessage,
  SetMapStateMessage,
  TileClickMessage,
  getMapUrl,
} from '../../editor/floatingMap/connection'
import { editorAtoms } from '../editor-state'

interface LevelMapProps {
  className?: string
}

type MapStatus = 'idle' | 'loading' | 'contentLoading' | 'ready' | 'error'

const stageNameAtom = atom((get) => get(editorAtoms.operationBase).stageName)

const findActiveActionAtom = (get: Getter) => {
  const activeActionId = get(editorAtoms.activeActionIdAtom)
  const actionAtoms = get(editorAtoms.actionAtoms)
  return actionAtoms.find((atom) => get(atom).id === activeActionId)
}
const activeActionLocationAtom = atom(
  (get) => {
    const actionAtom = findActiveActionAtom(get)
    if (!actionAtom) return undefined
    const action = get(actionAtom)
    if ('location' in action) {
      return action.location
    }
    return undefined
  },
  (get, set, location: [number, number]) => {
    const actionAtom = findActiveActionAtom(get)
    if (!actionAtom) return
    set(actionAtom, (prev) =>
      produce(prev, (draft) => {
        if (
          draft.type === CopilotDocV1.Type.Deploy ||
          draft.type === CopilotDocV1.Type.Retreat ||
          draft.type === CopilotDocV1.Type.Skill ||
          draft.type === CopilotDocV1.Type.BulletTime
        ) {
          draft.location = location
        }
      }),
    )
  },
)

// Defer initializing the map until it's visible. It's handled via atoms instead of
// component states to avoid unnecessary rerenders when the map has already been initialized.
const initializedAtom = atom(false)
const shouldInitializeAtom = atom(
  (get) =>
    !get(initializedAtom) && get(editorAtoms.selectorPanelMode) === 'map',
)

export const LevelMap: FC<LevelMapProps> = memo(({ className }) => {
  const t = useTranslation()
  const { data: levels } = useLevels()
  const [initialized, setInitialized] = useAtom(initializedAtom)
  const shouldInitialize = useAtomValue(shouldInitializeAtom)
  const stageName = useAtomValue(stageNameAtom)
  const [activeLocation, setActiveLocation] = useAtom(activeActionLocationAtom)
  const level = useMemo(
    () => (stageName ? findLevelByStageName(levels, stageName) : undefined),
    [stageName, levels],
  )
  const [mapStatus, setMapStatus] = useState<MapStatus>('idle')
  const [iframeWindow, setIframeWindow] = useState<Window | null>(null)

  useEffect(() => {
    setMapStatus((status) => {
      if (level) {
        return status === 'idle' || status === 'error' ? 'loading' : status
      }
      return 'idle'
    })
  }, [level])

  // update or reset the active tiles when active action's location changes
  const setMapState = useCallback(() => {
    if (iframeWindow) {
      const activeTiles =
        activeLocation?.[0] !== undefined && activeLocation?.[1] !== undefined
          ? [{ x: activeLocation[0], y: activeLocation[1] }]
          : []
      sendMessage<SetMapStateMessage>(iframeWindow, MAP_ORIGIN, {
        type: 'setMapState',
        data: { activeTiles },
      })
    }
  }, [iframeWindow, activeLocation])

  // immediately sync remote state when local state has changed
  useEffect(setMapState, [setMapState])

  useMessage<TileClickMessage>(MAP_ORIGIN, 'tileClick', (e) => {
    const location = e.message.data.maaLocation
    setActiveLocation(location)
  })

  useMessage<MapReadyMessage>(MAP_ORIGIN, 'mapReady', () => {
    setMapStatus('ready')

    // sync remote state when it is ready
    setMapState()
  })

  // check the connection when the component is re-mounted, useful during development
  useEffect(() => {
    if (iframeWindow) {
      sendMessage<CheckMapMessage>(iframeWindow, MAP_ORIGIN, {
        type: 'checkMap',
      })
    }
  }, [iframeWindow])

  useEffect(() => {
    if (shouldInitialize) {
      setInitialized(true)
    }
  }, [shouldInitialize, setInitialized])

  if (!initialized) {
    return null
  }

  return (
    <div className={clsx('relative flex-grow', className)}>
      {level && (
        <iframe
          title="Theresa Map"
          className="w-full h-full"
          src={getMapUrl(level)}
          onLoad={(e) => {
            setIframeWindow(e.currentTarget.contentWindow)
            setMapStatus('contentLoading')
          }}
        />
      )}
      {(mapStatus === 'idle' || mapStatus === 'loading') && (
        <NonIdealState
          className="absolute inset-0"
          icon={
            mapStatus === 'loading' ? (
              <Spinner className="[&_.bp4-spinner-head]:stroke-current" />
            ) : (
              'area-of-interest'
            )
          }
          description={
            mapStatus === 'idle'
              ? t.components.editor2.LevelMap.select_level
              : undefined
          }
        />
      )}
    </div>
  )
})
LevelMap.displayName = 'LevelMap'
