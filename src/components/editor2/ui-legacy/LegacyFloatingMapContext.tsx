import { ReactNode, createContext, useContext, useMemo, useState } from 'react'

import { Level } from '../../../models/operation'

export interface LegacyMapTile {
  x: number
  y: number
}

interface LegacyFloatingMapContextValue {
  level?: Level
  setLevel: (level?: Level) => void
  activeTiles: LegacyMapTile[]
  setActiveTiles: (tiles: LegacyMapTile[]) => void
}

const LegacyFloatingMapContextObject = createContext<LegacyFloatingMapContextValue>({} as LegacyFloatingMapContextValue)

export function useLegacyFloatingMap() {
  return useContext(LegacyFloatingMapContextObject)
}

export function LegacyFloatingMapContext({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<Level>()
  const [activeTiles, setActiveTiles] = useState<LegacyMapTile[]>([])

  const value = useMemo(() => ({ level, setLevel, activeTiles, setActiveTiles }), [level, activeTiles])
  return <LegacyFloatingMapContextObject.Provider value={value}>{children}</LegacyFloatingMapContextObject.Provider>
}
