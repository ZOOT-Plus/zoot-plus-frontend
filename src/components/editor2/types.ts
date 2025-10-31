import { SetRequired, Simplify } from 'type-fest'

import { CopilotDocV1 } from '../../models/copilot.schema'
import { PartialDeep } from '../../utils/partial-deep'
import { SimingActionDelays } from './siming/constants'

export type WithId<T = {}> = T extends never ? never : T & { id: string }

export type WithPartialCoordinates<T> = T extends {
  location?: [number, number]
}
  ? Omit<T, 'location'> & {
      location?: [number | undefined, number | undefined]
    }
  : T extends {
        distance?: [number, number]
      }
    ? Omit<T, 'distance'> & {
        distance?: [number | undefined, number | undefined]
      }
    : T

export type EditorOperationBase = Simplify<
  Omit<
    PartialDeep<CopilotDocV1.Operation>,
    'doc' | 'opers' | 'groups' | 'actions'
  > & {
    minimumRequired: string
    doc: PartialDeep<CopilotDocV1.Doc>
    simingActionDelays?: SimingActionDelays
  }
>

// Editor-only 扩展容器（v1）：统一承载命盘/星石/辅星与基础数值
export interface EditorOperatorExtensionsV1 {
  version: 1
  discs?: {
    // 固定最多 3 槽；允许未满 3 长度；读写时请自行填充
    slots: Array<{
      // 0-based 槽位索引
      index: number
      // 与旧字段 discsSelected 语义一致：-1=任意，0=未选，>0=第 (value) 个命盘（1 基）
      disc: number
      // 星石/辅星名称，可空
      starStone?: string
      assistStar?: string
    }>
  }
  stats?: {
    // 基础数值（仅编辑器使用，不导出到协议）
    starLevel?: number // [1..6]
    attack?: number // >= 0
    hp?: number // >= 0
  }
}

export type EditorOperator = Simplify<
  WithId<
    SetRequired<PartialDeep<CopilotDocV1.Operator>, 'name'> & {
      // UI 扩展：每个密探可选择最多 3 个命盘（索引从 1 开始；0 或缺省表示未选）
      discsSelected?: number[]
      // UI 扩展：对应每个命盘的星石选择（名称字符串），长度与 discsSelected 对齐
      discStarStones?: string[]
      // UI 扩展：对应每个命盘的辅星选择（名称字符串），长度与 discsSelected 对齐
      discAssistStars?: string[]
      // 基础数值（原方案直挂根上；用于 Viewer 回退与导出 toMaaOperation 的 snake_case）
      starLevel?: number
      attack?: number
      hp?: number
      // 统一扩展容器（v1）：承载命盘/星石/辅星与基础数值，Editor-only
      extensions?: EditorOperatorExtensionsV1
    }
  >
>
export type EditorGroup = Simplify<
  WithId<
    PartialDeep<Omit<CopilotDocV1.Group, 'opers'>> & {
      name: string
      opers: EditorOperator[]
    }
  >
>

type GenerateEditorAction<T extends CopilotDocV1.Action> = T extends never
  ? never
  : Simplify<
      WithPartialCoordinates<
        Omit<
          SetRequired<PartialDeep<T>, 'type'>,
          'preDelay' | 'postDelay' | 'rearDelay'
        >
      > &
        WithId<{
          intermediatePreDelay?: number
          intermediatePostDelay?: number
        }>
    >

export type EditorAction = GenerateEditorAction<CopilotDocV1.Action>

export interface EditorOperation extends EditorOperationBase {
  opers: EditorOperator[]
  groups: EditorGroup[]
  actions: EditorAction[]
}

export type EditorSourceType = 'original' | 'repost'

export interface EditorMetadata {
  visibility: 'public' | 'private'
  sourceType: EditorSourceType
  repostAuthor?: string
  repostPlatform?: string
  repostUrl?: string
}

export interface EditorState {
  operation: EditorOperation
  metadata: EditorMetadata
}
