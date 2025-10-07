import { InputGroup, InputGroupProps2 } from '@blueprintjs/core'

import {
  ControllerProps,
  FieldValues,
  UseControllerProps,
} from 'react-hook-form'

import { FormField, FormFieldProps } from 'components/FormField'
import { REGEX_EMAIL, REGEX_USERNAME } from 'utils/regexes'

import { useTranslation } from '../../i18n/i18n'

export type RuleKeys =
  | 'email'
  | 'password'
  | 'username'
  | 'registertoken'
  | 'registercode'

function useRules(): Record<RuleKeys, UseControllerProps['rules']> {
  const t = useTranslation()
  return {
    email: {
      required: t.components.account.AuthFormShared.email_required,
      pattern: {
        value: REGEX_EMAIL,
        message: t.components.account.AuthFormShared.email_invalid,
      },
    },
    password: {
      required: t.components.account.AuthFormShared.password_required,
      minLength: {
        value: 8,
        message: t.components.account.AuthFormShared.password_min_length,
      },
      maxLength: {
        value: 32,
        message: t.components.account.AuthFormShared.password_max_length,
      },
    },
    username: {
      required: t.components.account.AuthFormShared.username_required,
      minLength: {
        value: 4,
        message: t.components.account.AuthFormShared.username_min_length,
      },
      maxLength: {
        value: 24,
        message: t.components.account.AuthFormShared.username_max_length,
      },
      pattern: {
        value: REGEX_USERNAME,
        message: t.components.account.AuthFormShared.username_pattern,
      },
    },
    registertoken: {
      required: t.components.account.AuthFormShared.token_required,
      minLength: {
        value: 6,
        message: t.components.account.AuthFormShared.token_length,
      },
      maxLength: {
        value: 6,
        message: t.components.account.AuthFormShared.token_length,
      },
    },
    registercode: {
      required: t.components.account.AuthFormShared.registration_code_required,
    },
  }
}

export type AuthFormFieldProps<T extends FieldValues> = Pick<
  FormFieldProps<T, any>,
  'control' | 'error' | 'field'
> & {
  label?: string
  register?: boolean
  autoComplete?: string
  inputGroupProps?: (
    ...params: Parameters<ControllerProps<T, any>['render']>
  ) => InputGroupProps2
}

export const AuthFormEmailField = <T extends FieldValues>({
  label,
  control,
  error,
  field,
  register,
  autoComplete = 'email',
  inputGroupProps,
}: AuthFormFieldProps<T>) => {
  const t = useTranslation()
  const rules = useRules()

  return (
    <FormField
      label={label || t.components.account.AuthFormShared.email}
      field={field}
      control={control}
      error={error}
      ControllerProps={{
        rules: rules.email,
        render: (renderProps) => (
          <InputGroup
            id={field}
            placeholder="user@example.com"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            autoComplete={autoComplete}
            {...renderProps.field}
            value={renderProps.field.value || ''}
            {...inputGroupProps?.(renderProps)}
          />
        ),
      }}
      FormGroupProps={{
        helperText:
          register &&
          t.components.account.AuthFormShared.email_verification_note,
      }}
    />
  )
}

export const AuthRegistrationTokenField = <T extends FieldValues>({
  label,
  control,
  error,
  field,
  register,
  autoComplete = '',
  inputGroupProps,
}: AuthFormFieldProps<T>) => {
  const t = useTranslation()
  const rules = useRules()

  return (
    <FormField
      label={
        label || t.components.account.AuthFormShared.email_verification_code
      }
      field={field}
      control={control}
      error={error}
      ControllerProps={{
        rules: rules.registertoken,
        render: (renderProps) => (
          <InputGroup
            id={field}
            placeholder="123456"
            autoComplete={autoComplete}
            {...renderProps.field}
            value={renderProps.field.value || ''}
            {...inputGroupProps?.(renderProps)}
          />
        ),
      }}
      FormGroupProps={{
        helperText:
          register && t.components.account.AuthFormShared.enter_email_code,
      }}
    />
  )
}

export const AuthRegistrationCodeField = <T extends FieldValues>({
  label,
  control,
  error,
  field,
  register,
  autoComplete = '',
  inputGroupProps,
}: AuthFormFieldProps<T>) => {
  const t = useTranslation()
  const rules = useRules()

  return (
    <FormField
      label={label || t.components.account.AuthFormShared.registration_code}
      field={field}
      control={control}
      error={error}
      ControllerProps={{
        rules: rules.registercode,
        render: (renderProps) => (
          <InputGroup
            id={field}
            placeholder={t.components.account.AuthFormShared.registration_code}
            autoComplete={autoComplete}
            {...renderProps.field}
            value={renderProps.field.value || ''}
            {...inputGroupProps?.(renderProps)}
          />
        ),
      }}
      FormGroupProps={{
        helperText: register ? undefined : undefined,
      }}
    />
  )
}

export const AuthFormPasswordField = <T extends FieldValues>({
  label,
  control,
  error,
  field,
  autoComplete = 'current-password',
  inputGroupProps,
}: AuthFormFieldProps<T>) => {
  const t = useTranslation()
  const rules = useRules()

  return (
    <FormField
      label={label || t.components.account.AuthFormShared.password}
      field={field}
      control={control}
      error={error}
      ControllerProps={{
        rules: rules.password,
        render: (renderProps) => (
          <InputGroup
            id={field}
            placeholder="· · · · · · · ·"
            type="password"
            autoComplete={autoComplete}
            {...renderProps.field}
            value={renderProps.field.value || ''}
            {...inputGroupProps?.(renderProps)}
          />
        ),
      }}
    />
  )
}

export const AuthFormUsernameField = <T extends FieldValues>({
  label,
  control,
  error,
  field,
  autoComplete = 'username',
  inputGroupProps,
}: AuthFormFieldProps<T>) => {
  const t = useTranslation()
  const rules = useRules()

  return (
    <FormField
      label={label || t.components.account.AuthFormShared.username}
      field={field}
      control={control}
      error={error}
      ControllerProps={{
        rules: rules.username,
        render: (renderProps) => (
          <InputGroup
            id={field}
            placeholder="Pallas-Bot"
            autoComplete={autoComplete}
            {...renderProps.field}
            value={renderProps.field.value || ''}
            {...inputGroupProps?.(renderProps)}
          />
        ),
      }}
    />
  )
}
