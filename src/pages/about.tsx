import { H2 } from '@blueprintjs/core'

import { Markdown } from 'components/Markdown'

import changelog from '../../CHANGELOG.md?raw'
import { useTranslation } from '../i18n/i18n'

export const AboutPage = () => {
  const t = useTranslation()
  return (
    <div className="max-w-screen-md mx-auto">
      <div className="mt-8 flex flex-col items-center">
        <div className="text-[2rem] md:text-[3.75rem]">
          <div className="bg-rainbow relative !text-transparent !bg-clip-text font-bold italic leading-[1.2]">
            <div className="ml-[3.2em] mr-[0.2em] !text-inherit">{t.pages.about.slogan_line1}</div>
            <div className="text-[1.2em] !text-inherit">{t.pages.about.slogan_line2}</div>
          </div>
          <div className="bg-rainbow !bg-clip-content h-[0.1em] pr-[1em]" />
        </div>
      </div>

      <div className="mt-12 p-4">
        <H2>{t.pages.about.changelog}</H2>
        <Markdown>{changelog}</Markdown>
      </div>
    </div>
  )
}
