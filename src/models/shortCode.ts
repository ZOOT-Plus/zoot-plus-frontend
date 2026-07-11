/*
 * Format: prts://123456 (operation), prts://s123456 (operation set)
 * The `s` prefix lets clients distinguish operation sets from operations
 * without an extra round-trip.
 */

const operationScheme = 'prts://'
const operationSetScheme = 'prts://s'

export type ShortCodeType = 'operation' | 'operation-set'

export interface ShortCodeContent {
  id: number
  type: ShortCodeType
}

export function toShortCode({ id, type }: ShortCodeContent) {
  return (type === 'operation-set' ? operationSetScheme : operationScheme) + id
}

export function parseShortCode(code: string): ShortCodeContent | null {
  // check the longer prefix first: `prts://s` is a superset start of `prts://`
  const isSet = code.startsWith(operationSetScheme)
  if (!isSet && !code.startsWith(operationScheme)) return null
  const idStr = code.slice(isSet ? operationSetScheme.length : operationScheme.length)
  const id = +idStr
  if (idStr !== '' && !isNaN(id)) return { id, type: isSet ? 'operation-set' : 'operation' }
  return null
}