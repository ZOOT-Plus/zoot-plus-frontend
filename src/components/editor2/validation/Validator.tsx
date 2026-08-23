import { useAtom as useAtomValue, useSetAtom } from 'jotai'
import { debounce, isString } from 'lodash-es'
import { memo, ReactNode, useEffect, useMemo } from 'react'

import { Callout, CalloutProps, Icon } from '@blueprintjs/core'
import { languageChangeEmitter, translationsAtom } from '../../../i18n/i18n'
import { editorAtoms } from '../editor-state'
import { editorValidationAtom } from './validation'

export const Validator = memo(() => {
  const operation = useAtomValue(editorAtoms.operation)
  const translations = useAtomValue(translationsAtom)
  const validate = useSetAtom(editorValidationAtom)
  const debouncedValidate = useMemo(() => debounce(validate, 500), [validate])

  // re-validate when either operation or translations have changed
  useEffect(() => {
    debouncedValidate()
  }, [operation, translations, debouncedValidate])

  useEffect(() => {
    const onLanguageChange = () => debouncedValidate()
    languageChangeEmitter.on('localeLoadedForZod', onLanguageChange)
    return () => {
      languageChangeEmitter.off('localeLoadedForZod', onLanguageChange)
    }
  }, [debouncedValidate])

  return null
})
Validator.displayName = 'Validator'

interface IssuesDisplayProps extends CalloutProps {
  errors?: ReactNode[]
  warnings?: ReactNode[]
}

export function IssuesDisplay({ errors, warnings, ...props }: IssuesDisplayProps) {
  if (!errors?.length && !warnings?.length) return null
  return (
    <Callout compact {...props}>
      {errors?.map((message, i) => (
        <Callout
          minimal
          icon={null}
          intent="danger"
          className="p-0 text-xs leading-5"
          key={'e' + i + (isString(message) ? message : '')}
        >
          <Icon size={12} icon="cross-circle" className="mr-1 align-[-2px]" />
          {message}
        </Callout>
      ))}
      {warnings?.map((message, i) => (
        <Callout
          minimal
          icon={null}
          intent="warning"
          className="p-0 text-xs leading-5"
          key={'w' + i + (isString(message) ? message : '')}
        >
          <Icon size={12} icon="warning-sign" className="mr-1 align-[-2px]" />
          {message}
        </Callout>
      ))}
    </Callout>
  )
}
