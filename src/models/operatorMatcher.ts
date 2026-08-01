import { CopilotDocV1 } from './copilot.schema'
import { Operation } from './operation'
import { findOperatorById } from './operator'

const MAX_LEVELS_BY_RARITY: Record<number, number[]> = {
  0: [30, 0, 0],
  1: [30, 0, 0],
  2: [30, 0, 0],
  3: [40, 55, 0],
  4: [45, 60, 70],
  5: [50, 70, 80],
  6: [50, 80, 90],
}

export const OPERATOR_MATCH_MODES = ['ready', 'borrow', 'train', 'blocked'] as const
export type OperatorMatchMode = (typeof OPERATOR_MATCH_MODES)[number]

export const DEFAULT_OPERATOR_MATCH_MODES: OperatorMatchMode[] = ['ready', 'borrow', 'train']

export interface OwnedOperator {
  elite: number
  level: number
  mainSkillLevel?: number
  masteryLevels: number[]
  moduleLevels: Partial<Record<CopilotDocV1.Module, number>>
  name: string
  rarity: number
}

export interface OperatorMatcherFilter {
  modes: OperatorMatchMode[]
  ownedOperators: Map<string, OwnedOperator>
}

export interface OperationMatchResult {
  missingSlots: string[]
  mode: OperatorMatchMode
  totalSlots: number
  trainingSlots: string[]
}

type UnknownRecord = Record<string, unknown>

function toNonNegativeInteger(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : undefined
}

function toRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : undefined
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, '')
}

export function normalizeYituliuOwnedOperators(data: unknown): OwnedOperator[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.flatMap((value) => {
    const record = toRecord(value)

    if (!record) {
      return []
    }

    const id = typeof record?.id === 'string' ? record.id : ''
    const operator = id ? findOperatorById(id) : undefined
    const level = toNonNegativeInteger(record?.level)

    if (!operator || !level) {
      return []
    }

    const masteryLevels = Array.isArray(record.skills)
      ? record.skills.map((skill) => toNonNegativeInteger(toRecord(skill)?.level) ?? 0)
      : []
    const moduleLevels: Partial<Record<CopilotDocV1.Module, number>> = {}

    if (Array.isArray(record.equips)) {
      for (const equip of record.equips) {
        const type = toRecord(equip)?.type
        const level = toNonNegativeInteger(toRecord(equip)?.level)

        if (typeof type === 'string' && level !== undefined && type in CopilotDocV1.Module) {
          moduleLevels[CopilotDocV1.Module[type as keyof typeof CopilotDocV1.Module]] = level
        }
      }
    }

    return [
      {
        name: operator.name,
        rarity: operator.rarity,
        elite: toNonNegativeInteger(record.evolvePhase) ?? 0,
        level,
        mainSkillLevel: toNonNegativeInteger(record.mainSkillLevel),
        masteryLevels,
        moduleLevels,
      },
    ]
  })
}

export function createOwnedOperatorMap(operators: OwnedOperator[]) {
  return new Map(operators.map((operator) => [normalizeName(operator.name), operator]))
}

function getOwnedOperatorSnapshot(operators: OwnedOperator[]) {
  return Array.from(createOwnedOperatorMap(operators).entries())
    .sort(([firstName], [secondName]) => firstName.localeCompare(secondName))
    .map(([name, operator]) => ({
      name,
      rarity: operator.rarity,
      elite: operator.elite,
      level: operator.level,
      mainSkillLevel: operator.mainSkillLevel ?? null,
      masteryLevels: operator.masteryLevels,
      moduleLevels: Object.entries(operator.moduleLevels).sort(([firstModule], [secondModule]) => {
        return Number(firstModule) - Number(secondModule)
      }),
    }))
}

export function hasOwnedOperatorDataChanged(previous: OwnedOperator[], next: OwnedOperator[]) {
  return JSON.stringify(getOwnedOperatorSnapshot(previous)) !== JSON.stringify(getOwnedOperatorSnapshot(next))
}

function getProgressScore(rarity: number, elite: number, level: number) {
  const maxLevels = MAX_LEVELS_BY_RARITY[rarity] ?? MAX_LEVELS_BY_RARITY[6]
  let score = Math.max(1, level)

  for (let index = 0; index < elite; index += 1) {
    score += maxLevels[index] ?? 0
  }

  return score
}

function inferElite(rarity: number, level: number, elite: number | undefined) {
  if (elite !== undefined) {
    return elite
  }

  const maxLevels = MAX_LEVELS_BY_RARITY[rarity] ?? MAX_LEVELS_BY_RARITY[6]
  let inferredElite = 0

  while (inferredElite < maxLevels.length - 1 && level > (maxLevels[inferredElite] ?? 0)) {
    inferredElite += 1
  }

  return inferredElite
}

function isRequirementMet(requirement: CopilotDocV1.Operator, ownedOperator: OwnedOperator | undefined) {
  if (!ownedOperator) {
    return false
  }

  const requirements = requirement.requirements

  if (!requirements) {
    return true
  }

  if (requirements.elite !== undefined || requirements.level !== undefined) {
    const requiredLevel = requirements.level ?? 1
    const requiredElite = inferElite(ownedOperator.rarity, requiredLevel, requirements.elite)
    const ownedScore = getProgressScore(ownedOperator.rarity, ownedOperator.elite, ownedOperator.level)
    const requiredScore = getProgressScore(ownedOperator.rarity, requiredElite, requiredLevel)

    if (ownedScore < requiredScore) {
      return false
    }
  }

  if (requirements.skillLevel !== undefined) {
    if (requirements.skillLevel >= 8) {
      const skillIndex = requirement.skill
      const masteryLevel = skillIndex ? ownedOperator.masteryLevels[skillIndex - 1] : undefined

      if (masteryLevel === undefined || masteryLevel < requirements.skillLevel - 7) {
        return false
      }
    } else if ((ownedOperator.mainSkillLevel ?? 0) < requirements.skillLevel) {
      return false
    }
  }

  if (requirements.module !== undefined && requirements.module > CopilotDocV1.Module.Original) {
    if ((ownedOperator.moduleLevels[requirements.module] ?? 0) < 1) {
      return false
    }
  }

  return true
}

function evaluateGroup(group: CopilotDocV1.Group, ownedOperators: Map<string, OwnedOperator>) {
  const candidates = group.opers ?? []
  const ownedCandidates = candidates.filter((candidate) => ownedOperators.has(normalizeName(candidate.name)))

  if (
    ownedCandidates.some((candidate) => isRequirementMet(candidate, ownedOperators.get(normalizeName(candidate.name))))
  ) {
    return 'ready'
  }

  return ownedCandidates.length > 0 ? 'train' : 'missing'
}

export function getOperationMatchResult(
  operation: Operation,
  ownedOperators: Map<string, OwnedOperator>,
): OperationMatchResult {
  const missingSlots: string[] = []
  const trainingSlots: string[] = []
  const operators = operation.parsedContent.opers ?? []
  const groups = operation.parsedContent.groups ?? []

  for (const operator of operators) {
    const ownedOperator = ownedOperators.get(normalizeName(operator.name))

    if (!ownedOperator) {
      missingSlots.push(operator.name)
    } else if (!isRequirementMet(operator, ownedOperator)) {
      trainingSlots.push(operator.name)
    }
  }

  for (const group of groups) {
    const readiness = evaluateGroup(group, ownedOperators)

    if (readiness === 'missing') {
      missingSlots.push(group.name || group.opers?.map((operator) => operator.name).join(' / ') || '未命名分组')
    } else if (readiness === 'train') {
      trainingSlots.push(group.name || group.opers?.map((operator) => operator.name).join(' / ') || '未命名分组')
    }
  }

  const totalSlots = operators.length + groups.length

  if (totalSlots > 13 || missingSlots.length >= 2) {
    return { mode: 'blocked', missingSlots, trainingSlots, totalSlots }
  }

  if (missingSlots.length === 1) {
    return {
      mode: trainingSlots.length > 0 ? 'train' : 'borrow',
      missingSlots,
      trainingSlots,
      totalSlots,
    }
  }

  if (trainingSlots.length === 0) {
    return {
      mode: totalSlots === 13 ? 'borrow' : 'ready',
      missingSlots,
      trainingSlots,
      totalSlots,
    }
  }

  return {
    mode: trainingSlots.length === 1 && totalSlots < 13 ? 'borrow' : 'train',
    missingSlots,
    trainingSlots,
    totalSlots,
  }
}
