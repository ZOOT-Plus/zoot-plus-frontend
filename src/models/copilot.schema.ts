import { OpDifficulty } from './operation'

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

  export interface ActionDeploy extends ActionBase {
    direction: Direction
    // location: any[]
    // should be
    location: [number, number]
    name: string
    type: Type.Deploy
  }

  export type ActionSkillOrRetreatOrBulletTime = ActionBase &
    (
      | {
          // location: any[]
          // should be
          location: [number, number]
          name?: string
          type: Type.Skill | Type.Retreat | Type.BulletTime
        }
      | {
          // location?: any[]
          // should be
          location?: [number, number]
          name: string
          type: Type.Skill | Type.Retreat | Type.BulletTime
        }
    )

  export interface ActionSkillUsage extends ActionBase {
    name: string
    skillUsage: SkillUsageType
    type: Type.SkillUsage
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

  export interface Operator {
    /** Required in editor; should be stripped when exporting. */
    _id?: string
    /**
     * 必填
     */
    name: string
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
