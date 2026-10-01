import { Button, Card, NonIdealState, Spinner } from '@blueprintjs/core'

import clsx from 'clsx'
import { clamp, isNil } from 'lodash-es'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Rnd, RndResizeCallback } from 'react-rnd'
import { useWindowSize } from 'react-use'

import { useTranslation } from '../../../i18n/i18n'
import { Level } from '../../../models/operation'
import { sendMessage, useMessage } from '../../../utils/messenger'
import { useLazyStorage } from '../../../utils/useLazyStorage'
import { useLegacyFloatingMap } from './LegacyFloatingMapContext'
import {
  CheckMapMessage,
  ErrorMessage,
  MAP_ORIGIN,
  MapReadyMessage,
  SetMapStateMessage,
  getMapUrl,
} from './LegacyMapConnection'

interface FloatingMapConfig {
  show: boolean
  x: number
  y: number
  width: number
  height: number
  level?: Level
}

const UID = 'floating-map'
const STORAGE_KEY = `zoot-plus-${UID}`
const HEADER_CLASS = 'floating-map-header'
const HEADER_HEIGHT = 36
const ASPECT_RATIO = 16 / 9
const MIN_HEIGHT = 150 + HEADER_HEIGHT
const MIN_WIDTH = 150 * ASPECT_RATIO
const DEFAULT_HEIGHT = 300 + HEADER_HEIGHT
const DEFAULT_WIDTH = 300 * ASPECT_RATIO

const enum MapStatus {
  Loading,
  Ready,
  Error,
}

export function LegacyFloatingMap() {
  const t = useTranslation()
  const [config, setConfig] = useLazyStorage<FloatingMapConfig>(
    STORAGE_KEY,
    {
      show: true,
      x: 0,
      y: window.innerHeight - DEFAULT_HEIGHT,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      level: undefined,
    },
    (savedValue, defaultValue) => ({ ...defaultValue, ...savedValue }),
  )
  const { width: windowWidth, height: windowHeight } = useWindowSize()

  useEffect(() => {
    setConfig((cfg) => ({
      ...cfg,
      x: clamp(cfg.x, 0, windowWidth - cfg.width),
      y: clamp(cfg.y, 0, windowHeight - cfg.height),
    }))
  }, [setConfig, windowWidth, windowHeight])

  const [iframeWindow, setIframeWindow] = useState<Window | null | undefined>()
  const [mapStatus, setMapStatus] = useState(MapStatus.Loading)
  const { level, activeTiles } = useLegacyFloatingMap()

  useEffect(() => {
    setMapStatus(MapStatus.Loading)
    setConfig((cfg) => ({ ...cfg, level }))
  }, [setConfig, level])

  const setMapState = useCallback(() => {
    if (iframeWindow) {
      void sendMessage<SetMapStateMessage>(iframeWindow, MAP_ORIGIN, {
        type: 'setMapState',
        data: { activeTiles },
      })
    }
  }, [iframeWindow, activeTiles])

  useEffect(setMapState, [setMapState])

  useMessage<MapReadyMessage>(MAP_ORIGIN, 'mapReady', () => {
    setMapStatus(MapStatus.Ready)
    setMapState()
  })

  useMessage<ErrorMessage>(MAP_ORIGIN, 'error', ({ message }) => {
    setMapStatus(MapStatus.Error)
    console.warn('Map error:', message.data.reason)
  })

  useEffect(() => {
    if (iframeWindow) void sendMessage<CheckMapMessage>(iframeWindow, MAP_ORIGIN, { type: 'checkMap' })
  }, [iframeWindow])

  const toggleIframePointerEvents = useCallback((disable = false) => {
    Array.from(document.getElementsByTagName('iframe')).forEach((iframe) => {
      iframe.style.pointerEvents = disable ? 'none' : 'auto'
    })
  }, [])

  const onDragStartHandler = useCallback(() => toggleIframePointerEvents(true), [toggleIframePointerEvents])
  const onDragStopHandler = useCallback(
    (e, { x, y }) => {
      toggleIframePointerEvents(false)
      setConfig((cfg) => ({ ...cfg, x, y }))
    },
    [setConfig, toggleIframePointerEvents],
  )
  const onResizeStartHandler = useCallback(() => toggleIframePointerEvents(true), [toggleIframePointerEvents])
  const onResizeStopHandler: RndResizeCallback = useCallback(
    (e, direction, ref, delta, pos) => {
      toggleIframePointerEvents(false)
      setConfig((cfg) => ({
        ...cfg,
        ...pos,
        width: parseFloat(ref.style.width),
        height: parseFloat(ref.style.height),
      }))
    },
    [setConfig, toggleIframePointerEvents],
  )

  return createPortal(
    <div className="fixed z-30 inset-0 pointer-events-none">
      {config.show ? (
        <Rnd
          className="pointer-events-auto"
          dragHandleClassName={HEADER_CLASS}
          bounds="window"
          minWidth={MIN_WIDTH}
          minHeight={MIN_HEIGHT}
          lockAspectRatio={ASPECT_RATIO}
          lockAspectRatioExtraHeight={HEADER_HEIGHT}
          default={config}
          position={config}
          onDragStart={onDragStartHandler}
          onDragStop={onDragStopHandler}
          onResizeStart={onResizeStartHandler}
          onResizeStop={onResizeStopHandler}
        >
          <Card className="h-full !p-0 flex flex-col overflow-hidden" elevation={3}>
            <LegacyFloatingMapHeader config={config} setConfig={setConfig} />
            {level ? (
              <div className="relative flex-grow">
                <iframe
                  title={UID}
                  className="w-full h-full"
                  src={getMapUrl(level)}
                  onLoad={(event) => setIframeWindow(event.currentTarget.contentWindow)}
                />
                {mapStatus === MapStatus.Loading && (
                  <NonIdealState
                    className="absolute inset-0 bg-gray-900/50 [&_*]:!text-white"
                    icon={<Spinner className="[&_.bp6-spinner-head]:stroke-current" />}
                    description={
                      iframeWindow ? undefined : t.components.editor.floatingMap.FloatingMap.waiting_connection
                    }
                  />
                )}
              </div>
            ) : (
              <NonIdealState
                icon="area-of-interest"
                title={t.components.editor.floatingMap.FloatingMap.no_stage_selected}
              />
            )}
          </Card>
        </Rnd>
      ) : (
        <Card className="absolute !p-0 overflow-hidden pointer-events-auto left-4 bottom-4" elevation={2}>
          <LegacyFloatingMapHeader config={config} setConfig={setConfig} />
        </Card>
      )}
    </div>,
    document.body,
  )
}

function LegacyFloatingMapHeader({
  className,
  config,
  setConfig,
}: {
  className?: string
  config: FloatingMapConfig
  setConfig: (config: FloatingMapConfig) => void
}) {
  const t = useTranslation()
  let levelName = config.level?.name

  if (isNil(levelName)) levelName = t.components.editor.floatingMap.FloatingMap.no_stage_selected
  else if (!levelName.trim()) levelName = t.components.editor.floatingMap.FloatingMap.unnamed_stage

  return (
    <div
      className={clsx(
        className,
        HEADER_CLASS,
        'flex items-center text-xs bg-gray-200 dark:bg-slate-500',
        config.show ? 'cursor-move' : 'cursor-default',
      )}
      style={{ height: HEADER_HEIGHT }}
    >
      <Button
        minimal
        style={{ height: HEADER_HEIGHT }}
        className="px-4"
        title={
          config.show
            ? t.components.editor.floatingMap.FloatingMap.hide_map
            : t.components.editor.floatingMap.FloatingMap.show_map
        }
        icon={config.show ? 'caret-down' : 'caret-up'}
        onClick={() => setConfig({ ...config, show: !config.show })}
      >
        {t.components.editor.floatingMap.FloatingMap.map}
        {config.show && ` - ${levelName}`}
      </Button>
    </div>
  )
}
