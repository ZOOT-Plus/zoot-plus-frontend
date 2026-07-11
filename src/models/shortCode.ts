/*
 * Short code protocol:
 *   old: maa://123456                       (operations & operation sets share one scheme)
 *   new: prts://123456 / prts://s123456     (the `s` prefix marks an operation set,
 *                                            so clients can tell them apart without a round-trip)
 */

const oldScheme = 'maa://'
const operationScheme = 'prts://'
const operationSetScheme = 'prts://s'

// ponytail: 双协议过渡开关。2026-07-20 00:00（按用户本地系统时间）起切到 prts:// 新协议；
// 过渡稳定一两个版本后删除本开关与旧 maa:// 分支，统一只走新协议。
const NEW_PROTOCOL_CUTOFF = new Date('2026-07-20T00:00:00').getTime()
export const useNewShortCodeProtocol = () => Date.now() >= NEW_PROTOCOL_CUTOFF

export type ShortCodeType = 'operation' | 'operation-set'

export interface ShortCodeContent {
  id: number
  type: ShortCodeType
}

export function toShortCode({ id, type }: ShortCodeContent) {
  if (!useNewShortCodeProtocol()) {
    return oldScheme + id
  }
  return (type === 'operation-set' ? operationSetScheme : operationScheme) + id
}

export function parseShortCode(code: string): ShortCodeContent | null {
  if (useNewShortCodeProtocol()) {
    // check the longer prefix first: `prts://s` is a superset start of `prts://`
    const isSet = code.startsWith(operationSetScheme)
    if (!isSet && !code.startsWith(operationScheme)) return null
    const idStr = code.slice(isSet ? operationSetScheme.length : operationScheme.length)
    const id = +idStr
    if (idStr !== '' && !isNaN(id)) return { id, type: isSet ? 'operation-set' : 'operation' }
    return null
  }

  // 旧协议：maa:// 不区分类型，默认按作业处理
  if (code.startsWith(oldScheme)) {
    const idStr = code.slice(oldScheme.length)
    const id = +idStr
    if (idStr !== '' && !isNaN(id)) return { id, type: 'operation' }
  }
  return null
}