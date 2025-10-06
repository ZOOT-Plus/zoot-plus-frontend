import { CopilotInfo } from 'maa-copilot-client'

import { CopilotDocV1 } from 'models/copilot.schema'

export type Operation = CopilotInfo & {
  parsedContent: CopilotDocV1.Operation
  // 后端冗余关卡信息直接构造成 Level，避免反推
  preLevel?: Level
}

// 与后端 v2 对齐的关卡类型（向后兼容 v1，game 可选）
export type Level = {
  game?: string
  levelId: string
  stageId: string
  catOne: string
  catTwo: string
  catThree: string
  name: string
  width: number
  height: number
}

export enum OpRatingType {
  None = 0,
  Like = 1,
  Dislike = 2,
}

export enum OpDifficulty {
  UNKNOWN = 0,
  REGULAR = 1,
  HARD = 2,
  REGULAR_HARD = 1 | 2,
}

export enum OpDifficultyBitFlag {
  REGULAR = 1,
  HARD = 2,
}

export enum MinimumRequired {
  V4_0_0 = 'v4.0.0',
}
