import { Level } from '../../../models/operation'
import { Message } from '../../../utils/messenger'

export const MAP_SERVER = import.meta.env.VITE_THERESA_SERVER as string

if (!MAP_SERVER) {
  throw new Error('Environment variable VITE_THERESA_SERVER is not defined.')
}

export const MAP_ORIGIN = MAP_SERVER
export const getMapUrl = (level: Level) => `${MAP_SERVER}/widget/map/${level.stageId.replace('#f#', '__f__')}/scene`

export type MapReadyMessage = Message<'mapReady'>
export type CheckMapMessage = Message<'checkMap'>
export type TileClickMessage = Message<
  'tileClick',
  {
    index: number
    width: number
    height: number
    maaLocation: [x: number, y: number]
    tile: IMapDataTiles
  }
>
export type SetMapStateMessage = Message<'setMapState', { activeTiles: { x: number; y: number }[] }>
export type ErrorMessage = Message<'error', { reason: string }>

export interface IMapDataTiles {
  blackboard: unknown
  buildableType: unknown
  effects: unknown
  heightType: unknown
  passableMask: unknown
  tileKey: string
}
