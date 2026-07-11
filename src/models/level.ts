/**
 * Note: In levels, the stageId is always unique, other fields may not be.
 *
 * With other fields conflicting, the stageId will be different in three ways:
 * 1. a001_ex04 / a001_ex04#f#
 * 2. act1bossrush_01 / act1bossrush_tm01
 * 3. ro1_e_1_1 / ro1_n_1_1
 *
 * Only the first two kinds are supported in PRTS Plus.
 */
import { i18n } from '../i18n/i18n'
import { Level, OpDifficulty } from './operation'

const HARD_MODE_SUFFIX = '#f#'
const BOSSRUSH_NORMAL_INFIX = 'bossrush_'
const BOSSRUSH_HARD_INFIX = 'bossrush_tm'

const customLevelKey = '__customLevel'

export function createCustomLevel(name: string): Level {
  return {
    ...{ [customLevelKey]: true },
    name,
    stageId: name,
    levelId: '',
    catOne: i18n.models.level.custom_level,
    catTwo: '',
    catThree: name,
    width: 0,
    height: 0,
  }
}

export function isCustomLevel(level: Level): boolean {
  return customLevelKey in level
}

export function isHardMode(stageId: string) {
  return stageId.endsWith(HARD_MODE_SUFFIX) || stageId.includes(BOSSRUSH_HARD_INFIX)
}

export function toHardMode(stageId: string) {
  if (isHardMode(stageId)) {
    return stageId
  }

  const replacedStageId = stageId.replace(BOSSRUSH_NORMAL_INFIX, BOSSRUSH_HARD_INFIX)
  if (replacedStageId !== stageId) {
    return replacedStageId
  }

  return stageId + HARD_MODE_SUFFIX
}

export function toNormalMode(stageId: string) {
  return isHardMode(stageId)
    ? stageId.replace(HARD_MODE_SUFFIX, '').replace(BOSSRUSH_HARD_INFIX, BOSSRUSH_NORMAL_INFIX)
    : stageId
}

export function getStageIdWithDifficulty(stageId: string, difficulty: OpDifficulty) {
  if (difficulty & OpDifficulty.HARD) {
    return toHardMode(stageId)
  }
  if (difficulty & OpDifficulty.REGULAR) {
    return toNormalMode(stageId)
  }

  // if neither hard nor normal is expected, return as is
  return stageId
}

export function findLevelByStageName(levels: Level[], stageName: string) {
  return levels.find((level) => matchLevelByStageName(level, stageName))
}

export function hasHardMode(levels: Level[], stageName: string) {
  if (isHardMode(stageName)) {
    return true
  }

  let stageId: string

  // stageId always contains "_" while levelId and name don't
  if (stageName.includes('_')) {
    stageId = stageName
  } else {
    const level = findLevelByStageName(levels, stageName)

    // return false if there's no such level
    if (!level) {
      return false
    }

    stageId = level.stageId
  }

  if (isHardMode(stageId)) {
    return true
  }

  const hardStageId = toHardMode(stageId)

  return !!levels.find((level) => level.stageId === hardStageId)
}

export function matchLevelByStageName(level: Level, stageName: string) {
  return (
    matchStageIdIgnoringDifficulty(level.stageId, stageName) || level.levelId === stageName || level.name === stageName
  )
}

export function matchStageIdIgnoringDifficulty(id1: string, id2: string) {
  return (
    id1 === id2 ||
    id1 === id2 + HARD_MODE_SUFFIX ||
    id1 + HARD_MODE_SUFFIX === id2 ||
    id1.replace(BOSSRUSH_HARD_INFIX, BOSSRUSH_NORMAL_INFIX) === id2 ||
    id1.replace(BOSSRUSH_NORMAL_INFIX, BOSSRUSH_HARD_INFIX) === id2
  )
}

export function getPrtsMapUrl(stageId: string) {
  return `https://map.ark-nights.com/map/${stageId}?coord_override=maa`
}
