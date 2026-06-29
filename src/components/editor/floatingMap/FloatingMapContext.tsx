import { ReactNode, createContext, useContext, useMemo, useState } from 'react'

import { Level } from '../../../models/operation'

export interface MapTile {
  x: number
  y: number
}

export interface IFloatingMapContext {
  level?: Level
  setLevel: (level?: Level) => void
  activeTiles: MapTile[]
  setActiveTiles: (tiles: MapTile[]) => void
}

const FloatingMapContextObject = createContext<IFloatingMapContext>({} as any)

export function useFloatingMap() {
  return useContext(FloatingMapContextObject)
}

export function FloatingMapContext({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<Level>()
  const [activeTiles, setActiveTiles] = useState<MapTile[]>([])

  const value = useMemo(
    () => ({
      level,
      setLevel,
      activeTiles,
      setActiveTiles,
    }),
    [level, activeTiles],
  )

  return <FloatingMapContextObject.Provider value={value}>{children}</FloatingMapContextObject.Provider>
}
