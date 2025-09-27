import { useAtomValue, useSetAtom } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import { noop } from 'lodash-es'
import { Suspense, useEffect } from 'react'
import useSWR from 'swr'

import {
  Language,
  RawTranslations,
  i18n,
  languageAtom,
  rawTranslationsAtom,
} from './i18n'

let refresh: () => void = noop

export const I18NProvider = ({ children }: { children: JSX.Element }) => {
  // We use Suspense but without a fallback because React somehow tries to throttle
  // the loading state and shows the fallback for a longer time than needed,
  // likely 200-500ms, although the loading of translations is almost instant...
  return (
    <Suspense fallback={null}>
      <I18NProviderInner>{children}</I18NProviderInner>
    </Suspense>
  )
}

const I18NProviderInner = ({ children }: { children: JSX.Element }) => {
  const language = useAtomValue(languageAtom)
  const setRawTranslations = useSetAtom(rawTranslationsAtom)
  const { data, mutate } = useSWR(
    'i18n-' + language,
    async () => {
      const translations = await loadTranslations(language)
      const rawTranslations: RawTranslations = {
        language,
        data: translations,
      }
      return rawTranslations
    },
    {
      suspense: true,
      keepPreviousData: true,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  refresh = mutate

  useEffect(() => {
    // update the atom with new translations
    setRawTranslations(data)
  }, [data, setRawTranslations])

  // set initial value for the atom
  useHydrateAtoms([[rawTranslationsAtom, data]])
  return children
}

const hotReloadedModules: Partial<Record<Language, Record<string, unknown>>> =
  {}

async function loadTranslations(language: Language) {
  if (import.meta.hot) {
    if (hotReloadedModules[language]) {
      return hotReloadedModules[language]
    }
  }

  try {
    // note: modules must be imported with literal strings, otherwise HMR won't work
    if (language === 'cn') {
      return (await import(`./generated/cn`)).default
    }
    return (await import(`./generated/zh_tw`)).default
  } catch (e) {
    throw new Error(i18n.essentials.translation_load_failed)
  }
}

// handle HMR
if (import.meta.hot) {
  import.meta.hot.accept(
    ['./generated/cn', './generated/zh_tw'],
    ([cnModule, zhTwModule]) => {
      if (cnModule?.default) {
        hotReloadedModules['cn'] = cnModule?.default
      }
      if (zhTwModule?.default) {
        hotReloadedModules['zh_tw'] = zhTwModule?.default
      }
      refresh()
    },
  )
}
