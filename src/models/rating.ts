import { clamp } from 'lodash-es'

import { i18n } from '../i18n/i18n'

const minRatingLevel = 0
const maxRatingLevel = 10

export function ratingLevelToString(level: number): string {
  const ratingLevelKeys = [
    i18n.models.rating.overwhelmingly_negative,
    i18n.models.rating.very_negative,
    i18n.models.rating.negative,
    i18n.models.rating.mostly_negative,
    i18n.models.rating.mixed,
    i18n.models.rating.mostly_positive,
    i18n.models.rating.positive,
    i18n.models.rating.very_positive,
    i18n.models.rating.overwhelmingly_positive,
  ]

  const ratio = level / (maxRatingLevel - minRatingLevel)

  const index = clamp(Math.floor(ratio * ratingLevelKeys.length), 0, ratingLevelKeys.length - 1)

  return ratingLevelKeys[index]
}
