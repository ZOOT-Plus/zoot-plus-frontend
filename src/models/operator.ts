import { IconName } from '@blueprintjs/core'

import { useAtomValue } from 'jotai'
import { clamp, defaults, mapValues } from 'lodash-es'

import { CopilotDocV1 } from 'models/copilot.schema'

import {
  DetailedSelectChoice,
  isChoice,
} from '../components/editor/DetailedSelect'
import { Language, i18n, i18nDefer, languageAtom } from '../i18n/i18n'
import { OPERATORS, PROFESSIONS } from '../models/generated/operators.json'

export { OPERATORS, PROFESSIONS }

export type OperatorInfo = (typeof OPERATORS)[number] & {
  modules?: (keyof typeof CopilotDocV1.Module | null)[]
}
export type Profession = (typeof PROFESSIONS)[number]

const OPERATORS_BY_ID = Object.fromEntries(
  OPERATORS.map((operator) => [operator.id, operator]),
)
export function findOperatorById(id: string): OperatorInfo | undefined {
  return OPERATORS_BY_ID[id]
}

const OPERATORS_BY_NAME = Object.fromEntries(
  OPERATORS.map((operator) => [operator.name, operator]),
)
export function findOperatorByName(name: string): OperatorInfo | undefined {
  return OPERATORS_BY_NAME[name]
}

export const MODULE_ALT_NAMES = {
  A: 'α',
  D: 'Δ',
  [CopilotDocV1.Module.A]: 'α',
  [CopilotDocV1.Module.D]: 'Δ',
}

export function getModuleName(module: CopilotDocV1.Module): string {
  return MODULE_ALT_NAMES[module] ?? CopilotDocV1.Module[module] ?? '?'
}

const defaultSkillUsage = CopilotDocV1.SkillUsageType.None

export type DetailedOperatorSkillUsage = DetailedSelectChoice & {
  value: number
  title: () => string
  description: () => string
  altTitle: () => string
}

// skill counts that do not follow the general rules
const specialSkillCounts = {
  char_002_amiya: 3, // 阿米娅
  char_509_acast: 1, // Pith
  char_508_aguard: 1, // Sharp
  char_511_asnipe: 1, // Stormeye
  char_510_amedic: 1, // Touch
  char_606_csuppo: 3, // 预备干员-辅助
  char_506_rmedic: 0, // 预备干员-后勤
  char_601_cguard: 3, // 预备干员-近卫
  char_504_rguard: 0, // 预备干员-近战
  char_507_rsnipe: 0, // 预备干员-狙击
  char_603_csnipe: 3, // 预备干员-狙击
  char_505_rcast: 0, // 预备干员-术师
  char_604_ccast: 3, // 预备干员-术师
  char_607_cspec: 3, // 预备干员-特种
  char_600_cpione: 3, // 预备干员-先锋
  char_605_cmedic: 3, // 预备干员-医疗
  char_514_rdfend: 0, // 预备干员-重装
  char_602_cdfend: 3, // 预备干员-重装
  char_513_apionr: 1, // 郁金香
}

export function getSkillCount({ id, rarity }: OperatorInfo): number {
  if (specialSkillCounts[id]) {
    return specialSkillCounts[id]
  }
  if (rarity === 6) {
    return 3
  }
  if (rarity === 5 || rarity === 4) {
    return 2
  }
  if (rarity === 3) {
    return 1
  }
  return 0
}

const defaultRequirementsByRarity: Record<
  number,
  Required<CopilotDocV1.Requirements>
> = mapValues(
  {
    0: { elite: 0, level: 1, skillLevel: 1 },
    1: { elite: 0, level: 30, skillLevel: 1 },
    2: { elite: 0, level: 30, skillLevel: 1 },
    3: { elite: 1, level: 55, skillLevel: 7 },
    4: { elite: 1, level: 60, skillLevel: 7 },
    5: { elite: 2, level: 40, skillLevel: 7 },
    6: { elite: 2, level: 60, skillLevel: 10 },
  },
  (baseRequirements) => ({
    ...baseRequirements,
    potentiality: 1,
    module: CopilotDocV1.Module.Default,
  }),
)

export function getDefaultRequirements(rarity = 6) {
  return defaultRequirementsByRarity[rarity] ?? defaultRequirementsByRarity[6]
}

export function withDefaultRequirements(
  baseRequirements: CopilotDocV1.Requirements = {},
  rarity = 6,
): Required<CopilotDocV1.Requirements> {
  const defaultRequirements = getDefaultRequirements(rarity)
  return defaults({}, baseRequirements, defaultRequirements)
}

export function adjustOperatorLevel({
  // 未知稀有度按6星算
  rarity = 6,
  elite,
  level,
  delta,
  roundTo = Math.abs(delta),
}: {
  rarity?: number
  elite: number
  level: number
  delta: number
  roundTo?: number
}) {
  if (delta === 0) {
    return { elite, level }
  }

  let elite1 = 50
  let elite2: number
  let maxLevel: number

  if (rarity === 6) {
    elite2 = elite1 + 80
    maxLevel = elite2 + 90
  } else if (rarity === 5) {
    elite2 = elite1 + 70
    maxLevel = elite2 + 80
  } else if (rarity === 4) {
    elite2 = elite1 + 60
    maxLevel = elite2 + 70
  } else if (rarity === 3) {
    elite2 = 0
    maxLevel = elite1 + 55
  } else {
    elite1 = 0
    elite2 = 0
    maxLevel = 30
  }

  if (elite === 1) {
    level += elite1
  } else if (elite === 2) {
    level += elite2
  }

  ;(() => {
    // 特殊处理：把精英1满级和精英2 1级当成两个边界点，从任何方向尝试跨越时都只能落到这两个点上
    if (elite2 !== 0) {
      if (
        (level > elite2 + 1 && level + delta <= elite2 + 1) ||
        (level === elite2 && delta > 0)
      ) {
        level = elite2 + 1
        return
      } else if (
        (level < elite2 && level + delta >= elite2) ||
        (level === elite2 + 1 && delta < 0)
      ) {
        level = elite2
        return
      }
    }
    // 同上，处理精英0满级和精英1 1级
    if (elite1 !== 0) {
      if (
        (level > elite1 + 1 && level + delta <= elite1 + 1) ||
        (level === elite1 && delta > 0)
      ) {
        level = elite1 + 1
        return
      } else if (
        (level < elite1 && level + delta >= elite1) ||
        (level === elite1 + 1 && delta < 0)
      ) {
        level = elite1
        return
      }
    }

    level += delta
    level = (delta < 0 ? Math.ceil : Math.floor)(level / roundTo) * roundTo
    level = clamp(level, 1, maxLevel)
  })()

  if (elite2 !== 0 && level > elite2) {
    elite = 2
    level -= elite2
  } else if (elite1 !== 0 && level > elite1) {
    elite = 1
    level -= elite1
  } else {
    elite = 0
  }
  return { elite, level }
}

export const operatorSkillUsages: DetailedOperatorSkillUsage[] = [
  {
    type: 'choice',
    icon: 'disable',
    title: i18nDefer.models.operator.skill_usage.none.title,
    altTitle: i18nDefer.models.operator.skill_usage.none.alt_title,
    value: CopilotDocV1.SkillUsageType.None,
    description: i18nDefer.models.operator.skill_usage.none.description,
  },
  {
    type: 'choice',
    icon: 'automatic-updates',
    title: i18nDefer.models.operator.skill_usage.ready_to_use.title,
    altTitle: i18nDefer.models.operator.skill_usage.ready_to_use.alt_title,
    value: CopilotDocV1.SkillUsageType.ReadyToUse,
    description: i18nDefer.models.operator.skill_usage.ready_to_use.description,
  },
  {
    type: 'choice',
    icon: 'circle',
    title: i18nDefer.models.operator.skill_usage.ready_to_use_times.title,
    altTitle:
      i18nDefer.models.operator.skill_usage.ready_to_use_times.alt_title,
    value: CopilotDocV1.SkillUsageType.ReadyToUseTimes,
    description:
      i18nDefer.models.operator.skill_usage.ready_to_use_times.description,
  },
  {
    type: 'choice',
    icon: 'predictive-analysis',
    title: i18nDefer.models.operator.skill_usage.automatically.title,
    altTitle: i18nDefer.models.operator.skill_usage.automatically.alt_title,
    value: CopilotDocV1.SkillUsageType.Automatically,
    description:
      i18nDefer.models.operator.skill_usage.automatically.description,
    disabled: true,
  },
]

export const alternativeOperatorSkillUsages: DetailedOperatorSkillUsage[] =
  operatorSkillUsages.map((item) => ({
    ...item,
    title: item.altTitle,
  }))

const unknownSkillUsage: DetailedOperatorSkillUsage = {
  type: 'choice',
  icon: 'error',
  title: i18nDefer.models.operator.skill_usage.unknown.title,
  altTitle: i18nDefer.models.operator.skill_usage.unknown.title,
  value: -1,
  description: () => '',
}

export function findOperatorSkillUsage(
  value: number = defaultSkillUsage,
): DetailedOperatorSkillUsage {
  return (
    operatorSkillUsages.filter(isChoice).find((item) => item.value === value) ||
    unknownSkillUsage
  )
}

export function getSkillUsageTitle(
  skillUsage: CopilotDocV1.SkillUsageType,
  skillTimes?: CopilotDocV1.SkillTimes,
) {
  if (
    skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes &&
    skillTimes !== undefined
  ) {
    return i18n.models.operator.skill_usage.ready_to_use_times.format({
      times: skillTimes,
    })
  }
  return findOperatorSkillUsage(skillUsage).title()
}

export function getSkillUsageAltTitle(
  skillUsage: CopilotDocV1.SkillUsageType,
  skillTimes?: CopilotDocV1.SkillTimes,
) {
  if (skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes) {
    return i18n.models.operator.skill_usage.ready_to_use_times.alt_format({
      times: skillTimes ?? 1,
    })
  }
  return findOperatorSkillUsage(skillUsage).altTitle()
}

export interface OperatorDirection {
  icon?: IconName
  title: () => string
  value: CopilotDocV1.Direction | null
}

const defaultDirection: CopilotDocV1.Direction =
  'None' as CopilotDocV1.Direction.None

export const operatorDirections: OperatorDirection[] = [
  // TODO: remove these string literals when CopilotDocV1 can be imported
  {
    icon: 'slash',
    title: i18nDefer.models.operator.direction.none,
    value: 'None' as CopilotDocV1.Direction.None,
  },
  {
    icon: 'arrow-up',
    title: i18nDefer.models.operator.direction.up,
    value: 'Up' as CopilotDocV1.Direction.Up,
  },
  {
    icon: 'arrow-down',
    title: i18nDefer.models.operator.direction.down,
    value: 'Down' as CopilotDocV1.Direction.Down,
  },
  {
    icon: 'arrow-left',
    title: i18nDefer.models.operator.direction.left,
    value: 'Left' as CopilotDocV1.Direction.Left,
  },
  {
    icon: 'arrow-right',
    title: i18nDefer.models.operator.direction.right,
    value: 'Right' as CopilotDocV1.Direction.Right,
  },
]

const unknownDirection: OperatorDirection = {
  icon: 'error',
  title: i18nDefer.models.operator.direction.unknown,
  value: null,
}

export function findOperatorDirection(
  value: CopilotDocV1.Direction = defaultDirection,
): OperatorDirection {
  return (
    operatorDirections.find((item) => item.value === value) || unknownDirection
  )
}

export interface ActionDocColor {
  title: () => string
  value: string
}

// Colors from
// https://github.com/MaaAssistantArknights/MaaAssistantArknights/blob/50f5f94dfcc2ec175556bbaa55d0ffec74128a8e/src/MeoAsstGui/Helper/LogColor.cs
export const actionDocColors: ActionDocColor[] = [
  {
    title: i18nDefer.models.operator.color.gray,
    value: 'Gray',
  },
  {
    title: i18nDefer.models.operator.color.black,
    value: 'Black',
  },
  {
    title: i18nDefer.models.operator.color.dark_red,
    value: 'DarkRed',
  },
  {
    title: i18nDefer.models.operator.color.dark_goldenrod,
    value: 'DarkGoldenrod',
  },
  {
    title: i18nDefer.models.operator.color.gold,
    value: 'Gold',
  },
  {
    title: i18nDefer.models.operator.color.spring_green,
    value: 'SpringGreen',
  },
  {
    title: i18nDefer.models.operator.color.dark_cyan,
    value: 'DarkCyan',
  },
  {
    title: i18nDefer.models.operator.color.deep_sky_blue,
    value: 'DeepSkyBlue',
  },
  {
    title: i18nDefer.models.operator.color.purple,
    value: '#6f42c1',
  },
  {
    title: i18nDefer.models.operator.color.pink,
    value: '#d63384',
  },
]

export function getLocalizedOperatorName(name: string, lang: Language): string {
  if (lang === 'zh_tw') {
    const operator = findOperatorByName(name)
    if (operator) return operator.name_en
  }
  return name
}

export function useLocalizedOperatorName(name: string): string {
  const lang = useAtomValue(languageAtom)
  return getLocalizedOperatorName(name, lang)
}

export function getEliteIconUrl(elite: number) {
  return new URL(`/src/assets/icons/elite_${elite}.png`, import.meta.url).href
}
