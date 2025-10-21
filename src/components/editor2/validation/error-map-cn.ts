import { Primitive } from 'type-fest'
import type { core } from 'zod'

const Sizable: Record<string, { unit: string; verb: string }> = {
  string: { unit: '字符', verb: '有' },
  file: { unit: '字节', verb: '有' },
  array: { unit: '元素', verb: '有' },
  set: { unit: '元素', verb: '有' },
}

function getSizing(origin: string): { unit: string; verb: string } | null {
  return Sizable[origin] ?? null
}

export const parsedType = (data: any): string => {
  const t = typeof data

  switch (t) {
    case 'number': {
      return Number.isNaN(data) ? 'NaN' : 'number'
    }
    case 'object': {
      if (Array.isArray(data)) {
        return 'array'
      }
      if (data === null) {
        return 'null'
      }

      if (
        Object.getPrototypeOf(data) !== Object.prototype &&
        data.constructor
      ) {
        return data.constructor.name
      }
    }
  }
  return t
}

export function stringifyPrimitive(value: any): string {
  if (typeof value === 'bigint') return value.toString() + 'n'
  if (typeof value === 'string') return `"${value}"`
  return `${value}`
}

export function joinValues<T extends Primitive[]>(
  array: T,
  separator = '|',
): string {
  return array.map((val) => stringifyPrimitive(val)).join(separator)
}

const error: core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return `无效的输入：期望 ${issue.expected}，收到 ${parsedType(issue.input)}`
    case 'invalid_value':
      if (issue.values.length === 1)
        return `无效的输入：期望 ${stringifyPrimitive(issue.values[0])}`
      return `无效的选项：期望是 ${joinValues(issue.values, '|')} 之一`
    case 'too_big': {
      const adj = issue.inclusive ? '<=' : '<'
      const sizing = getSizing(issue.origin)
      if (sizing)
        return `太大了：期望 ${issue.origin ?? '值'} ${adj}${issue.maximum.toString()} ${sizing.unit ?? '元素'}`
      return `太大了：期望 ${issue.origin ?? '值'} ${adj}${issue.maximum.toString()}`
    }
    case 'too_small': {
      const adj = issue.inclusive ? '>=' : '>'
      const sizing = getSizing(issue.origin)
      if (sizing) {
        return `太小了：期望 ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit}`
      }

      return `太小了：期望 ${issue.origin} ${adj}${issue.minimum.toString()}`
    }
    case 'invalid_format': {
      const _issue = issue as core.$ZodStringFormatIssues
      if (_issue.format === 'starts_with') {
        return `无效的字符串：必须以 "${_issue.prefix}" 开头`
      }
      if (_issue.format === 'ends_with')
        return `无效的字符串：必须以 "${_issue.suffix}" 结尾`
      if (_issue.format === 'includes')
        return `无效的字符串：必须包含 "${_issue.includes}"`
      if (_issue.format === 'regex')
        return `无效的字符串：必须匹配模式 ${_issue.pattern}`
      return `无效的 ${issue.format}`
    }
    case 'not_multiple_of':
      return `无效的数字：必须是 ${issue.divisor} 的倍数`
    case 'unrecognized_keys':
      return `未识别的键${issue.keys.length > 1 ? 's' : ''}：${joinValues(issue.keys, ', ')}`
    case 'invalid_key':
      return `无效的键在 ${issue.origin}`
    case 'invalid_union':
      return '无效的输入'
    case 'invalid_element':
      return `无效的值在 ${issue.origin}`
    default:
      return `无效的输入`
  }
}

export { error }

export default function (): { localeError: core.$ZodErrorMap } {
  return {
    localeError: error,
  }
}
