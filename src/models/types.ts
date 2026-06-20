import { IconName } from '@blueprintjs/core'

import { groupBy } from 'lodash-es'

import { i18nDefer } from '../i18n/i18n'
import { CopilotDocV1 } from './copilot.schema'

interface ActionType {
  type: 'choice'
  icon: IconName
  accent: string
  accentText: string
  accentBg: string
  title: () => string
  shortTitle: () => string
  value: CopilotDocV1.Type
  alternativeValue: string
  description: () => string
  group: () => string
}
export const ACTION_TYPES: ActionType[] = [
  {
    type: 'choice',
    icon: 'new-object',
    accent: 'border-sky-700',
    accentText: 'text-sky-700 dark:text-sky-400',
    accentBg: 'bg-sky-700',
    title: i18nDefer.models.types.action_type.deploy.title,
    shortTitle: i18nDefer.models.types.action_type.deploy.short_title,
    value: CopilotDocV1.Type.Deploy,
    alternativeValue: '部署',
    description: i18nDefer.models.types.action_type.deploy.description,
    group: i18nDefer.models.types.action_group.operator_deploy_retreat,
  },
  {
    type: 'choice',
    icon: 'graph-remove',
    accent: 'border-amber-700',
    accentText: 'text-amber-700 dark:text-amber-400',
    accentBg: 'bg-amber-700',
    title: i18nDefer.models.types.action_type.retreat.title,
    shortTitle: i18nDefer.models.types.action_type.retreat.short_title,
    value: CopilotDocV1.Type.Retreat,
    alternativeValue: '撤退',
    description: i18nDefer.models.types.action_type.retreat.description,
    group: i18nDefer.models.types.action_group.operator_deploy_retreat,
  },
  {
    type: 'choice',
    icon: 'target',
    accent: 'border-lime-700',
    accentText: 'text-lime-700 dark:text-lime-400',
    accentBg: 'bg-lime-700',
    title: i18nDefer.models.types.action_type.skill.title,
    shortTitle: i18nDefer.models.types.action_type.skill.short_title,
    value: CopilotDocV1.Type.Skill,
    alternativeValue: '技能',
    description: i18nDefer.models.types.action_type.skill.description,
    group: i18nDefer.models.types.action_group.operator_skills,
  },
  {
    type: 'choice',
    icon: 'swap-horizontal',
    accent: 'border-emerald-700',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBg: 'bg-emerald-700',
    title: i18nDefer.models.types.action_type.skill_usage.title,
    shortTitle: i18nDefer.models.types.action_type.skill_usage.short_title,
    value: CopilotDocV1.Type.SkillUsage,
    alternativeValue: '技能用法',
    description: i18nDefer.models.types.action_type.skill_usage.description,
    group: i18nDefer.models.types.action_group.operator_skills,
  },
  {
    type: 'choice',
    icon: 'fast-forward',
    accent: 'border-pink-700',
    accentText: 'text-pink-700 dark:text-pink-400',
    accentBg: 'bg-pink-700',
    title: i18nDefer.models.types.action_type.speed_up.title,
    shortTitle: i18nDefer.models.types.action_type.speed_up.short_title,
    value: CopilotDocV1.Type.SpeedUp,
    alternativeValue: '二倍速',
    description: i18nDefer.models.types.action_type.speed_up.description,
    group: i18nDefer.models.types.action_group.battle_control,
  },
  {
    type: 'choice',
    icon: 'fast-backward',
    accent: 'border-blue-700',
    accentText: 'text-blue-700 dark:text-blue-400',
    accentBg: 'bg-blue-700',
    title: i18nDefer.models.types.action_type.bullet_time.title,
    shortTitle: i18nDefer.models.types.action_type.bullet_time.short_title,
    value: CopilotDocV1.Type.BulletTime,
    alternativeValue: '子弹时间',
    description: i18nDefer.models.types.action_type.bullet_time.description,
    group: i18nDefer.models.types.action_group.battle_control,
  },
  {
    type: 'choice',
    icon: 'camera',
    accent: 'border-blue-700',
    accentText: 'text-blue-700 dark:text-blue-400',
    accentBg: 'bg-blue-700',
    title: i18nDefer.models.types.action_type.move_camera.title,
    shortTitle: i18nDefer.models.types.action_type.move_camera.short_title,
    value: CopilotDocV1.Type.MoveCamera,
    alternativeValue: '移动相机',
    description: i18nDefer.models.types.action_type.move_camera.description,
    group: i18nDefer.models.types.action_group.battle_control,
  },
  {
    type: 'choice',
    icon: 'antenna',
    accent: 'border-violet-700',
    accentText: 'text-violet-700 dark:text-violet-400',
    accentBg: 'bg-violet-700',
    title: i18nDefer.models.types.action_type.skill_daemon.title,
    shortTitle: i18nDefer.models.types.action_type.skill_daemon.short_title,
    value: CopilotDocV1.Type.SkillDaemon,
    alternativeValue: '摆完挂机',
    description: i18nDefer.models.types.action_type.skill_daemon.description,
    group: i18nDefer.models.types.action_group.battle_control,
  },
  {
    type: 'choice',
    icon: 'paragraph',
    accent: 'border-fuchsia-700',
    accentText: 'text-fuchsia-700 dark:text-fuchsia-400',
    accentBg: 'bg-fuchsia-700',
    title: i18nDefer.models.types.action_type.output.title,
    shortTitle: i18nDefer.models.types.action_type.output.short_title,
    value: CopilotDocV1.Type.Output,
    alternativeValue: '打印',
    description: i18nDefer.models.types.action_type.output.description,
    group: i18nDefer.models.types.action_group.miscellaneous,
  },
]

export const ACTION_TYPES_BY_GROUP = groupBy(ACTION_TYPES, 'group')

export const validTypesFollowingBulletTime = [
  CopilotDocV1.Type.Deploy,
  CopilotDocV1.Type.Skill,
  CopilotDocV1.Type.Retreat,
]

const notFoundActionType: Omit<ActionType, 'value'> & { value: 'Unknown' } = {
  type: 'choice',
  icon: 'help',
  accent: 'border-zinc-700',
  accentText: 'text-zinc-700 dark:text-zinc-400',
  accentBg: 'bg-zinc-700',
  title: i18nDefer.models.types.action_type.unknown.title,
  shortTitle: i18nDefer.models.types.action_type.unknown.short_title,
  value: 'Unknown',
  alternativeValue: '',
  description: i18nDefer.models.types.action_type.unknown.description,
  group: i18nDefer.models.types.action_group.unknown,
}

export const findActionType = (type?: string) => {
  if (!type) return notFoundActionType
  return ACTION_TYPES.find((item) => item.value === type || item.alternativeValue === type) || notFoundActionType
}

export type ActionConditionType =
  | 'costs'
  | 'costChanges'
  | 'kills'
  | 'cooling'
  | 'intermediatePreDelay'
  | 'intermediatePostDelay'

export const ACTION_CONDITIONS: Record<
  ActionConditionType,
  { title: () => string; icon: IconName; description: () => string }
> = {
  // 注意这里 intermediatePreDelay/intermediatePostDelay 和动作里 preDelay/rearDelay 的含义是反过来的！！！
  // 主要是便于设计 UI 和易于让用户理解
  intermediatePreDelay: {
    title: i18nDefer.models.types.action_condition.intermediate_pre_delay.title,
    icon: 'time',
    description: i18nDefer.models.types.action_condition.intermediate_pre_delay.description,
  },
  intermediatePostDelay: {
    title: i18nDefer.models.types.action_condition.intermediate_post_delay.title,
    icon: 'time',
    description: i18nDefer.models.types.action_condition.intermediate_post_delay.description,
  },
  costs: {
    title: i18nDefer.models.types.action_condition.costs.title,
    icon: 'dollar',
    description: i18nDefer.models.types.action_condition.costs.description,
  },
  costChanges: {
    title: i18nDefer.models.types.action_condition.cost_changes.title,
    icon: 'dollar',
    description: i18nDefer.models.types.action_condition.cost_changes.description,
  },
  kills: {
    title: i18nDefer.models.types.action_condition.kills.title,
    icon: 'locate',
    description: i18nDefer.models.types.action_condition.kills.description,
  },
  cooling: {
    title: i18nDefer.models.types.action_condition.cooling.title,
    icon: 'people',
    description: i18nDefer.models.types.action_condition.cooling.description,
  },
}
