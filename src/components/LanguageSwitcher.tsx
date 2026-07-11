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
  const shrinked = useCurrentSize().isLG
  const [language, setLanguage] = useAtom(languageAtom)

  // 当前语言对应的选项。作为 DetailedSelect 的 value（显示选中标记）和
  // Select 的 activeItem（ popover 打开时的键盘焦点高亮），避免高亮总是落在
  // 排序后的第一项 English 上、被误认为「当前选中项」。
  const activeOption = options.find((option) => option.value === language)

  return (
    <DetailedSelect
      items={options}
      value={language}
      activeItem={activeOption}
      onItemSelect={(item) => setLanguage(item.value as (typeof options)[number]['value'])}
      popoverProps={{
        matchTargetWidth: !shrinked,
      }}
    >
      <Button
        icon="translate"
        text={!shrinked && allEssentials[language].language}
        rightIcon={shrinked ? undefined : 'caret-down'}
      />
    </DetailedSelect>
  )
})
