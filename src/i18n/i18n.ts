import { atom, getDefaultStore, useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { get, isObject, isString } from 'lodash-es'
import mitt from 'mitt'
import { Fragment, ReactElement, ReactNode, createElement } from 'react'

// 本地实现：将字符串中的换行转为 <br/>（仅 JSX 模式使用）
function preserveLineBreaks(text: string): ReactNode[] {
  const parts = text.split('\n')
  const result: ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) result.push(createElement('br', { key: 'br-' + i }))
    result.push(parts[i])
  }
  return result
}
import ESSENTIALS from './generated/essentials'

export const languages = ['cn', 'zh_tw'] as const
const browserLanguage = navigator.language.toLowerCase()
const defaultLanguage =
  browserLanguage.includes('zh-hant') ||
  browserLanguage.includes('zh_tw') ||
  browserLanguage.includes('zh-tw')
    ? 'zh_tw'
    : 'cn'

const updater = mitt()

export type Language = (typeof languages)[number]

export type I18NTranslations = MakeTranslations<
  | typeof import('./generated/cn').default
  | typeof import('./generated/zh_tw').default
> & { essentials: I18NEssentials }

type I18NEssentials = MakeTranslations<(typeof ESSENTIALS)[Language]>

type MakeTranslations<T> = MakeEndpoints<ParseValue<T>>

// 1. First pass: Convert a tree of messages to a tree of strings and interpolation keys
//
// - If a value is a plain string, replace it with `string`
// - If a value is an interpolation string, extract interpolation keys and replace it with the keys
// - If a value is a plural object, replace it with object['other'] as an interpolation string with an additional `count` key
//
// During this pass, we preserve distributivity to properly handle cases where a message
// is of different kinds in different languages. In the following example, the "cn"
// message is a plain string, while the "zh_tw" message is a plural object:
//
// "error_count": {
//   "cn": "{{count}} 个错误",
//   "zh_tw": {
//     "1": "{{count}} error",
//     "other": "{{count}} errors"
//   }
// }
//
// Ref: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types

type ParseValue<T> = T extends string
  ? ParseMessage<T, []>
  : T extends PluralObject
    ? ParseMessage<T['other'], ['count']>
    : { [P in keyof T]: ParseValue<T[P]> }

type ParseMessage<
  T extends string,
  InitialKeys extends string[],
  Keys = InterpolationKeys<T, InitialKeys>,
> = Keys extends [] ? string : Keys

type InterpolationKeys<
  Str,
  Keys extends string[],
> = Str extends `${string}{{${infer Key}}}${infer End}`
  ? InterpolationKeys<End, [...Keys, Key]>
  : Keys

type PluralObject = Record<`${number}` | 'other', string>

// 2. Second pass: Convert a tree of strings and interpolation keys to a tree of strings and functions (endpoints)
//
// - If a value is a string, do nothing
// - If a value is interpolation keys, convert it to a function
//
// During this pass, we *prevent* distributivity and merge the unions to keep the endpoint function types
// clean and human-readable.
//
// Tricks to prevent distributivity:
// - For a conditional type, either invert the condition if possible, e.g. `string extends T`,
//   or wrap the type parameter in an array, e.g. `[T] extends [string]`.
// - For a mapped type, make it non-homomorphic[1] by extracting `keyof T` to a new type parameter `K`.
//
// [1]: https://stackoverflow.com/a/59791889/13237325

type MakeEndpoints<T, K extends keyof T = keyof T> = string extends T
  ? T
  : [T] extends [string[]]
    ? Interpolation<T> & {}
    : { [P in K]: MakeEndpoints<T[P]> }

type Interpolation<
  Keys extends string[],
  KeyMapping = {
    [K in Keys[number]]: K extends `${infer Name}(${string})` ? Name : K
  },
> = ((options: {
  [K in keyof KeyMapping as K extends KeyMapping[K] ? K : never]: Primitive
}) => string) & {
  jsx: (options: {
    [K in keyof KeyMapping as KeyMapping[K] & string]: KeyMapping[K] extends K
      ? ReactNode
      : (arg?: string) => ReactNode
  }) => ReactElement
}

type Primitive = string | number | boolean | null | undefined

export const allEssentials = Object.fromEntries(
  Object.entries(ESSENTIALS).map(([language, data]) => [
    language,
    setupTranslations({
      language: language as Language,
      data,
    }),
  ]),
) as Record<Language, I18NEssentials>

const languageStorageKey = 'maa-copilot-lang'

let currentLanguage: Language
let currentTranslations: I18NTranslations | undefined

export const i18n = new Proxy(
  {} as I18NTranslations & { currentLanguage: Language },
  {
    get(target, prop) {
      if (prop === 'currentLanguage') {
        return currentLanguage
      }
      if (!currentTranslations) {
        if (prop === 'essentials') {
          return allEssentials[currentLanguage]
        }
        // if this error occurs during dev, it's probably because the code containing i18n.* is executed
        // before the translations are loaded, in which case you should change it to i18nDefer.*
        throw new Error(allEssentials[currentLanguage].translations_not_loaded)
      }
      return currentTranslations[prop] || prop
    },
  },
)

type Deferred<T> = T extends string
  ? () => string
  : T extends Function
    ? T
    : { [K in keyof T]: Deferred<T[K]> }

export const i18nDefer = createDeferredProxy(
  '',
) as unknown as Deferred<I18NTranslations>

function createDeferredProxy(path: string) {
  const toString = () => path

  let updatedValue: unknown
  updater.on(path, (value) => (updatedValue = value))

  return new Proxy(toString, {
    get(target, prop) {
      if (prop === 'toString') {
        return toString
      }
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        return target[prop]
      }
      if (typeof prop === 'symbol') {
        return undefined
      }
      target[prop] = createDeferredProxy(
        (path ? path + '.' : '') + String(prop),
      )
      return target[prop]
    },
    apply(target, _this, args) {
      if (updatedValue !== undefined) {
        if (typeof updatedValue === 'function') {
          return updatedValue(...args)
        }
        return updatedValue
      }
      if (currentTranslations) {
        const translated = get(currentTranslations, path)
        if (translated) {
          return translated
        }
      }
      return toString()
    },
  })
}

export const languageAtom = atomWithStorage<Language>(
  languageStorageKey,
  defaultLanguage,
  undefined,
  { getOnInit: true },
)

currentLanguage = getDefaultStore().get(languageAtom)

export interface RawTranslations {
  language: Language
  data: object
}

const internalRawTranslationsAtom = atom<RawTranslations | undefined>(undefined)
export const rawTranslationsAtom = atom(
  (get) => get(internalRawTranslationsAtom),
  (get, set, rawTranslations: RawTranslations) => {
    const translations = setupTranslations(rawTranslations) as I18NTranslations
    currentLanguage = rawTranslations.language
    currentTranslations = translations

    set(internalRawTranslationsAtom, rawTranslations)
    set(translationsAtom, translations)
  },
)
const internalTranslationsAtom = atom<I18NTranslations | undefined>(undefined)
export const translationsAtom = atom(
  (get) => {
    const translations = get(internalTranslationsAtom)
    if (!translations) {
      throw new Error(allEssentials[currentLanguage].translations_not_loaded)
    }
    return translations
  },
  (get, set, translations: I18NTranslations) =>
    set(internalTranslationsAtom, translations),
)

function setupTranslations({ language, data }: RawTranslations) {
  data = {
    ...data,
    essentials: ESSENTIALS[language],
  }

  const interpolationRegex = /{{([^}]*)}}/
  const functionalInterpolationKeyRegex = /(.*?)\((.*?)\)/

  const convert = (path: string, value: unknown) => {
    const converted = doConvert(path, value)
    updater.emit(path, converted)
    return converted
  }

  const doConvert = (path: string, value: unknown) => {
    let isPlural = false

    if (isObject(value)) {
      const keys = Object.keys(value)
      isPlural = keys.every(
        (key) => key === 'other' || !Number.isNaN(Number(key)),
      )
      if (!isPlural) {
        return Object.fromEntries(
          keys.map((key) => [key, convert(`${path}.${key}`, value[key])]),
        )
      }
    } else if (!isString(value)) {
      return value
    } else {
      const hasInterpolation = interpolationRegex.test(value)
      if (!hasInterpolation) {
        return value
      }
    }

    // as of now, value is either an interpolatable string or a plural object

    const interpolate = (
      options: Record<
        string,
        Primitive | ReactNode | ((arg?: string) => ReactNode)
      >,
      jsx: boolean,
    ) => {
      try {
        let message: string

        if (isPlural) {
          const pluralObject = value as PluralObject
          const count = options.count
          if (typeof count === 'number') {
            message = pluralObject[String(count)] ?? pluralObject.other
          } else {
            message = pluralObject.other
          }
        } else {
          message = value as string
        }

        const segments = message.split(interpolationRegex)
        if (segments.length === 1) {
          return message
        }

        const interpolated = segments.map((segment, index) => {
          if (index % 2 === 0) {
            if (segment && segment.includes('\n')) {
              // 仅在 JSX 模式下将换行渲染为 <br/>
              if (jsx) return preserveLineBreaks(segment)
              return segment
            }
            return segment
          }

          if (Object.prototype.hasOwnProperty.call(options, segment)) {
            return options[segment] as Primitive | ReactNode
          }

          const match = segment.match(functionalInterpolationKeyRegex)
          if (match) {
            const key = match[1]
            const arg = match[2]
            if (Object.prototype.hasOwnProperty.call(options, key)) {
              if (typeof options[key] === 'function') {
                return options[key](arg)
              }
              return options[key]
            }
          }

          return ''
        })
        if (jsx) {
          return createElement(Fragment, {}, ...interpolated)
        }
        return interpolated.join('')
      } catch (e) {
        console.error('Error in translation:', path, e)
        return path
      }
    }

    const interpolationEndpoint = (
      options: Record<string, Primitive>,
    ): string => interpolate(options, false) as string

    interpolationEndpoint.jsx = (
      options: Record<string, ReactNode | ((arg?: string) => ReactNode)>,
    ): ReactElement => interpolate(options, true) as ReactElement

    return interpolationEndpoint
  }

  return convert('', data)
}

export function useTranslation() {
  return useAtomValue(translationsAtom)
}
