/*
 * Short code protocol:
 *   legacy: maa://123456                   (untyped — operations & operation sets share one scheme)
 *   new:   prts://123456 / prts://s123456  (the `s` prefix marks an operation set, so clients can
 *                                          tell them apart without a round-trip)
 *
 * Parsing always accepts all three forms for cross-version compatibility;
 * only generation follows the protocol switch below.
 */

const legacyScheme = 'maa://'
const operationScheme = 'prts://'
const operationSetScheme = 'prts://s'

// ponytail: 过渡开关。2026-07-20 00:00（按用户本地系统时间）前仍生成 maa:// 旧协议代码，
// 之后生成 prts:// 新协议代码；解析始终兼容三种格式。过渡稳定一两个版本后删除本开关、
// toShortCode 的 maa:// 分支，并让 parseShortCode 不再返回 'legacy' 类型。
const NEW_PROTOCOL_CUTOFF = new Date('2026-07-20T00:00:00').getTime()
export const useNewShortCodeProtocol = () => Date.now() >= NEW_PROTOCOL_CUTOFF

export type ShortCodeType = 'operation' | 'operation-set'

export interface ShortCodeContent {
  id: number
  // 'legacy' = maa:// 旧协议代码，无类型标记，由调用方按上下文判断
  type: ShortCodeType | 'legacy'
}

export function toShortCode({ id, type }: ShortCodeContent) {
  if (!useNewShortCodeProtocol()) {
    return legacyScheme + id
  }
  return (type === 'operation-set' ? operationSetScheme : operationScheme) + id
}

export function parseShortCode(code: string): ShortCodeContent | null {
  // check the longer prts://s prefix before prts://
  if (code.startsWith(operationSetScheme)) {
    const idStr = code.slice(operationSetScheme.length)
    const id = +idStr
    if (idStr !== '' && !isNaN(id)) return { id, type: 'operation-set' }
  } else if (code.startsWith(operationScheme)) {
    const idStr = code.slice(operationScheme.length)
    const id = +idStr
    if (idStr !== '' && !isNaN(id)) return { id, type: 'operation' }
  } else if (code.startsWith(legacyScheme)) {
    const idStr = code.slice(legacyScheme.length)
    const id = +idStr
    if (idStr !== '' && !isNaN(id)) return { id, type: 'legacy' }
  }
  return null
}