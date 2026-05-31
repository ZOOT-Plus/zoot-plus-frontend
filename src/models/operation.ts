import { ArkLevelInfo, CopilotInfo } from 'maa-copilot-client'

import { CopilotDocV1 } from 'models/copilot.schema'

export type Operation = CopilotInfo & {
  parsedContent: CopilotDocV1.Operation
}

export type Level = ArkLevelInfo

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
  V4_0_0 = 'v6.0.0',
}
