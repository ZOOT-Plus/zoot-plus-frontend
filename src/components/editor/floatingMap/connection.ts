import { Level } from '../../../models/operation'
import { Message } from '../../../utils/messenger'

export const MAP_SERVER = import.meta.env.VITE_THERESA_SERVER as string

if (!MAP_SERVER) {
  throw new Error('Environment variable VITE_THERESA_SERVER is not defined.')
}

// in the future we may need some conversion on this
export const MAP_ORIGIN = MAP_SERVER

// 适配 API 格式：服务端路径要求使用 __f__，将 stageId 中的 #f# 进行转换
export const getMapUrl = (level: Level) =>
  `${MAP_SERVER}/widget/map/${level.stageId.replace('#f#', '__f__')}/scene`

/** Tells that the map is ready. */
export type MapReadyMessage = Message<'mapReady'>

/** Checks if the map is ready. The map should reply with a MapReadyMessage. */
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

export type SetMapStateMessage = Message<
  'setMapState',
  { activeTiles: { x: number; y: number }[] }
>

export type ErrorMessage = Message<'error', { reason: string }>

// types defined in Theresa-wiki

export interface IMapDataTiles {
  blackboard: unknown
  buildableType: unknown
  effects: unknown
  heightType: unknown
  passableMask: unknown
  tileKey: string
}
