import { Button } from '@blueprintjs/core'

import { useAtom } from 'jotai'
import { ComponentType } from 'react'

import { useCurrentSize } from 'utils/useCurrenSize'

import { allEssentials, languageAtom, languages } from '../i18n/i18n'
import { withGlobalErrorBoundary } from './GlobalErrorBoundary'
import { DetailedSelect } from './editor/DetailedSelect'

const options = languages
  .map((lang) => ({
    type: 'choice' as const,
    title: allEssentials[lang].language,
    value: lang,
  }))
  .sort((a, b) => a.title.localeCompare(b.title))

export const LanguageSwitcher: ComponentType = withGlobalErrorBoundary(() => {
  const { isSM } = useCurrentSize()
  const [language, setLanguage] = useAtom(languageAtom)

  return (
    <DetailedSelect
      items={options}
      value={language}
      canReset={false}
      onItemSelect={(item) =>
        setLanguage(item.value as (typeof options)[number]['value'])
      }
      popoverProps={{
        matchTargetWidth: !isSM,
      }}
    >
      <Button
        icon="translate"
        text={!isSM && allEssentials[language].language}
        rightIcon={isSM ? undefined : 'caret-down'}
      />
    </DetailedSelect>
  )
})
