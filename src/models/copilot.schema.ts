import { OpDifficulty, compareVersions } from './operation';

/**
 * 战斗流程协议 v1
 * https://maa.plus/docs/zh-cn/protocol/copilot-schema.html
 */
export namespace CopilotDocV1 {
  export const VERSION = 3

  export interface Operation {
    version?: number
    actions?: Action[]
    doc: Doc
    groups?: Group[]
    minimumRequired: string
    opers?: Operator[]
    /**
     * 必填。除危机合约外，均为关卡中文名
     */
    stageName: string
    difficulty?: OpDifficulty
  }

  export type OperationSnakeCased = import('type-fest').SnakeCasedPropertiesDeep<Operation>

  interface ActionBase {
    /** Required in editor; should be stripped when exporting. */
    _id?: string
    // Action common optional fields
    doc?: string
    docColor?: string
    costs?: number
    costChanges?: number
    kills?: number
    cooling?: number
    preDelay?: number
    rearDelay?: number
    postDelay?: number
  }

  export interface ActionDeploy extends ActionBase, OperatorIdentity {
    type: Type.Deploy
    direction: Direction
    location: [number, number]
  }

  export type ActionSkillOrRetreatOrBulletTime = ActionBase &
    (
      | ({
          location: [number, number]
          type: Type.Skill | Type.Retreat | Type.BulletTime
        } & Partial<OperatorIdentity>)
      | ({
          location?: [number, number]
          type: Type.Skill | Type.Retreat | Type.BulletTime
        } & OperatorIdentity)
    )

  export interface ActionSkillUsage extends ActionBase, OperatorIdentity {
    type: Type.SkillUsage
    skillUsage: SkillUsageType
    skillTimes?: number
  }

  export interface ActionUtil extends ActionBase {
    type: Type.SpeedUp | Type.Output | Type.SkillDaemon
  }

  export interface ActionMoveCamera extends ActionBase {
    type: Type.MoveCamera
    distance: [number, number]
    /** 为 true 时不等待当前波次结束、击杀数不清零，适用于同一波次内移动镜头 */
    keepKills?: boolean
  }

  export interface ActionClick extends ActionBase {
    type: Type.Click
    /** 720p 基准像素矩形 [x, y, w, h]，点击时在区域内随机取点；与 location 二选一 */
    rect?: [number, number, number, number]
    /** 战场格子坐标，任意合法格子（含 [0, 0]）；与 rect 二选一 */
    location?: [number, number]
  }

  export interface ActionSetUnitLocation extends ActionBase, OperatorIdentity {
    type: Type.SetUnitLocation
    /** 战场格子坐标，任意合法格子（含 [0, 0]），必填 */
    location: [number, number]
  }

  export interface ActionSwipe extends ActionBase {
    type: Type.Swipe
    /** 滑动起点矩形，720p 基准像素矩形 [x, y, w, h]，起点在区域内随机取点 */
    begin: [number, number, number, number]
    /** 滑动终点矩形，720p 基准像素矩形 [x, y, w, h]，终点在区域内随机取点 */
    end: [number, number, number, number]
    /** 滑动持续时间（毫秒），默认 0 */
    duration?: number
    /** 滑动结束后追加的补偿滑动方向：0 不启用，1/2/3/4 为上/下/左/右，默认 0 */
    extraSwipe?: number
    /** 滑动起始斜率，以 ×10 的整数存储（10 即 1.0），默认 10 */
    slopeIn?: number
    /** 滑动结束斜率，以 ×10 的整数存储（10 即 1.0），默认 10 */
    slopeOut?: number
    /** 滑动时是否附带暂停操作，仅部分触控模式支持 */
    withPause?: boolean
    /** 是否启用高分辨率滑动修正 */
    highResolutionSwipeFix?: boolean
  }

  export type Action =
    | ActionDeploy
    | ActionSkillOrRetreatOrBulletTime
    | ActionSkillUsage
    | ActionUtil
    | ActionMoveCamera
    | ActionClick
    | ActionSwipe
    | ActionSetUnitLocation

  export enum Direction {
    Left = 'Left',
    Right = 'Right',
    Up = 'Up',
    Down = 'Down',
    None = 'None',
  }

  export enum Type {
    BulletTime = 'BulletTime',
    Deploy = 'Deploy',
    Output = 'Output',
    Retreat = 'Retreat',
    Skill = 'Skill',
    SkillDaemon = 'SkillDaemon',
    SkillUsage = 'SkillUsage',
    SpeedUp = 'SpeedUp',
    MoveCamera = 'MoveCamera',
    Click = 'Click',
    Swipe = 'Swipe',
    SetUnitLocation = 'SetUnitLocation',
  }

  export interface Doc {
    details?: string
    detailsColor?: string
    title: string
    titleColor?: string
  }

  export interface Group {
    /** Required in editor; should be stripped when exporting. */
    _id?: string
    name: string
    opers?: Operator[]
  }

  export interface OperatorIdentity {
    name: string
    role?: string
  }

  export interface Operator extends OperatorIdentity {
    /** Required in editor; should be stripped when exporting. */
    _id?: string

    requirements?: Requirements
    /**
     * 可选，默认 1，取值范围 [1, 3]
     */
    skill?: number
    skillUsage?: SkillUsageType
    /**
     * 技能使用次数，可选，默认为 1
     */
    skillTimes?: number
  }

  export enum Role {
    Unknown = 'Unknown',
    Pioneer = 'Pioneer', // 先锋
    Warrior = 'Warrior', // 近卫
    Tank = 'Tank', // 重装
    Sniper = 'Sniper', // 狙击
    Caster = 'Caster', // 术士
    Medic = 'Medic', // 医疗
    Support = 'Support', // 辅助
    Special = 'Special', // 特种
    Token = 'Token', // 召唤物
    Trap = 'Trap', // 装置
  }

  export enum SkillUsageType {
    /**
     * 不自动使用
     */
    None = 0,
    /**
     * 好了就用
     */
    ReadyToUse = 1,
    /**
     * 好了就用-指定次数
     */
    ReadyToUseTimes = 2,
    /**
     * 自动使用
     */
    Automatically = 3,
  }

  export type SkillTimes = number

  export interface Requirements {
    elite?: number
    level?: number
    module?: Module
    potentiality?: number
    skillLevel?: number
  }

  export enum Module {
    /** 默认值，不做任何操作 */
    Default = -1,
    /** 切换为初始模组 */
    Original = 0,
    /** 切换为对应的模组 */
    X = 1,
    Y = 2,
    A = 3,
    D = 4,
  }
}

/**
 * 协议特性首次进入 copilot 协议的 MAA 版本注册表。
 * 新增仅新版 MAA 支持的动作或字段时在此登记，导出作业时会按所用特性自动抬升 minimum_required。
 */
export const PROTOCOL_FEATURE_MINIMUMS: ReadonlyArray<{
  version: string
  uses: (action: { type?: CopilotDocV1.Type; keepKills?: boolean }) => boolean
}> = [
  {
    // Click 与 Swipe 动作、MoveCamera 的 keep_kills 参数自 v6.18.0-beta.3 起进入协议
    version: 'v6.18.0-beta.3',
    uses: (action) =>
      action.type === CopilotDocV1.Type.Click ||
      action.type === CopilotDocV1.Type.Swipe ||
      (action.type === CopilotDocV1.Type.MoveCamera && action.keepKills === true),
  },
  {
    // SetUnitLocation 动作自 v6.18.0 起进入协议
    version: 'v6.18.0',
    uses: (action) => action.type === CopilotDocV1.Type.SetUnitLocation,
  },
]

/**
 * 计算作业应声明的最低 MAA 版本：取动作所用特性的要求与当前声明值中的较大者，不做降级。
 */
export function minimumRequiredForActions(
  actions: ReadonlyArray<{ type?: CopilotDocV1.Type; keepKills?: boolean } | undefined>,
  current?: string,
): string | undefined {
  let required = current
  for (const action of actions) {
    if (!action) continue
    for (const feature of PROTOCOL_FEATURE_MINIMUMS) {
      if (feature.uses(action) && (required === undefined || compareVersions(feature.version, required) > 0)) {
        required = feature.version
      }
    }
  }
  return required
}
