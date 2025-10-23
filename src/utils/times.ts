import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import relativeTime from 'dayjs/plugin/relativeTime'
import { getDefaultStore } from 'jotai'

import { Language, languageAtom } from '../i18n/i18n'

dayjs.extend(relativeTime)

function updateDayjsLocale(language: Language) {
  dayjs.locale(language === 'zh_tw' ? 'zh-tw' : 'zh-cn')
}

updateDayjsLocale(getDefaultStore().get(languageAtom))

getDefaultStore().sub(languageAtom, () => {
  updateDayjsLocale(getDefaultStore().get(languageAtom))
})

export type DayjsInput = string | number | dayjs.Dayjs | Date | null | undefined

export function formatRelativeTime(input: DayjsInput) {
  input = dayjs(input)
  return +input > +dayjs() ? input.toNow() : input.fromNow()
}

export function formatDateTime(input: DayjsInput) {
  return dayjs(input).format('YYYY-MM-DD HH:mm:ss')
}

export function formatDuration(milliseconds: number) {
  const hours = ~~(milliseconds / (60 * 60 * 1000))

  milliseconds -= hours * 60 * 60 * 1000

  const minutes = ~~(milliseconds / (60 * 1000))

  milliseconds -= minutes * 60 * 1000

  const seconds = ~~(milliseconds / 1000)

  milliseconds -= seconds * 1000

  if (hours > 0) {
    return `${hours}h${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m${seconds}s`
  } else if (seconds > 0) {
    return `${seconds + milliseconds / 1000}s`
  } else {
    return `${milliseconds}ms`
  }
}
