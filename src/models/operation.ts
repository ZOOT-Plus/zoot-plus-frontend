import SemVer from 'semver/classes/semver'

import { ArkLevelInfo, CopilotInfo } from 'zoot-plus-client'

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

/** 作业类型：创建后不可更改。PRTS = 动作序列自动化战斗；VIDEO = 玩家分享的攻略视频。 */
export const CopilotType = {
  PRTS: 'PRTS',
  VIDEO: 'VIDEO',
} as const
export type CopilotType = (typeof CopilotType)[keyof typeof CopilotType]

export enum MinimumRequired {
  V4_0_0 = 'v6.0.0',
}

/** 比较两个 `vX.Y.Z(-prerelease)` 版本串，返回 -1/0/1；格式不合法按相等处理 */
export function compareVersions(a: string, b: string): number {
  try {
    return new SemVer(a, true).compare(new SemVer(b, true))
  } catch {
    return 0
  }
}
