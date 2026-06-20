import { Callout } from '@blueprintjs/core'

import { FieldError, FieldErrors, FieldValues } from 'react-hook-form'

import { useTranslation } from '../../i18n/i18n'

interface FormErrorProps<T extends FieldValues> {
  errors: FieldErrors<T>
}

export const FormError = <T extends FieldValues>({ errors }: FormErrorProps<T>) => {
  const t = useTranslation()
  const errorsArray = Object.values(errors) as FieldError[]

  if (errorsArray.length === 0) {
    return null
  }

  return (
    <Callout intent="danger" className="mt-2" title={t.components.editor.FormError.error_occurred}>
      <ol className="list-decimal list-inside">
        {errorsArray.map((error, i) => (
          <li key={i}>{error?.message || t.components.editor.FormError.unknown_error}</li>
        ))}
      </ol>
    </Callout>
  )
}
