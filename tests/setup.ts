import { beforeEach } from 'vitest'

localStorage.clear()

// use dynamic imports after clearing localStorage so that any modules relying on localStorage start with a clean state
const [{ getDefaultStore }, { rawTranslationsAtom }, { default: englishTranslations }] = await Promise.all([
  import('jotai'),
  import('../src/i18n/i18n'),
  import('../src/i18n/generated/en'),
])

getDefaultStore().set(rawTranslationsAtom, {
  language: 'en',
  data: englishTranslations,
})

beforeEach(() => {
  localStorage.clear()
})
