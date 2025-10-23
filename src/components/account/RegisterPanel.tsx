import { Button } from '@blueprintjs/core'

import { register, sendRegistrationEmail } from 'apis/auth'
import { FC, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { AppToaster } from 'components/Toaster'
import { formatError } from 'utils/error'
import { REGEX_EMAIL } from 'utils/regexes'
import { wrapErrorMessage } from 'utils/wrapErrorMessage'

import { useTranslation } from '../../i18n/i18n'
import {
  AuthFormEmailField,
  AuthFormPasswordField,
  AuthFormUsernameField,
  AuthRegistrationCodeField,
  AuthRegistrationTokenField,
} from './AuthFormShared'

export interface RegisterFormValues {
  email: string
  password: string
  username: string
  registrationToken?: string
  registrationCode?: string
}

export const RegisterPanel: FC<{
  onComplete: () => void
}> = ({ onComplete }) => {
  const t = useTranslation()
  const useRegCode =
    ((import.meta as any).env?.VITE_USE_REG_CODE ?? '')
      .toString()
      .toLowerCase() === 'true'

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    getValues,
  } = useForm<RegisterFormValues>()
  const [isSendEmailButtonDisabled, setSendEmailButtonDisabled] =
    useState(false)
  const [countdown, setCountdown] = useState(60)
  const onSubmit = async (val: RegisterFormValues) => {
    await wrapErrorMessage(
      (e) =>
        t.components.account.RegisterPanel.registration_failed({
          error: formatError(e),
        }),
      register({
        email: val.email,
        username: val.username,
        password: val.password,
        ...(useRegCode
          ? { registrationCode: val.registrationCode || '' }
          : { registrationToken: val.registrationToken || '' }),
      }),
    )
    AppToaster.show({
      intent: 'success',
      message: t.components.account.RegisterPanel.registration_success,
    })
    onComplete()
  }
  const handleCountdownTick = () => {
    setCountdown((prevCountdown) => prevCountdown - 1)
  }
  useEffect(() => {
    let countdownInterval
    if (countdown <= 0) {
      setCountdown(60)
      setSendEmailButtonDisabled(false)
    } else if (isSendEmailButtonDisabled) {
      countdownInterval = setInterval(handleCountdownTick, 1000)
    }
    return () => clearInterval(countdownInterval)
  }, [isSendEmailButtonDisabled, countdown])

  const onEmailSubmit = async () => {
    try {
      const val = getValues()
      if (!REGEX_EMAIL.test(val.email)) {
        AppToaster.show({
          intent: 'danger',
          message: t.components.account.RegisterPanel.invalid_email,
        })
        return
      }
      if (!useRegCode) {
        await wrapErrorMessage(
          (e) =>
            t.components.account.RegisterPanel.send_failed({
              error: formatError(e),
            }),
          sendRegistrationEmail({ email: val.email }),
        )
      }
      AppToaster.show({
        intent: 'success',
        message: t.components.account.RegisterPanel.email_sent_success,
      })
      setSendEmailButtonDisabled(true)
    } catch (e) {
      console.warn(e)
    }
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <AuthFormEmailField
        register
        control={control}
        error={errors.email}
        field="email"
      />
      {!useRegCode && (
        <div className="mt-6 flex justify-end">
          <Button
            disabled={
              (!isValid && !isDirty) ||
              isSubmitting ||
              isSendEmailButtonDisabled
            }
            intent="primary"
            type="button"
            icon="envelope"
            className="self-stretch"
            onClick={onEmailSubmit}
          >
            {isSendEmailButtonDisabled
              ? t.components.account.RegisterPanel.retry_seconds({
                  seconds: countdown,
                })
              : t.components.account.RegisterPanel.send_verification_code}
          </Button>
        </div>
      )}
      {useRegCode ? (
        <AuthRegistrationCodeField
          register
          control={control}
          error={errors.registrationCode}
          field="registrationCode"
        />
      ) : (
        <AuthRegistrationTokenField
          register
          control={control}
          error={errors.registrationToken}
          field="registrationToken"
        />
      )}

      <AuthFormUsernameField
        control={control}
        error={errors.username}
        field="username"
      />

      <AuthFormPasswordField
        control={control}
        error={errors.password}
        field="password"
      />

      <div className="mt-6 flex justify-end">
        <Button
          disabled={(!isValid && !isDirty) || isSubmitting}
          intent="primary"
          loading={isSubmitting}
          type="submit"
          icon="envelope"
          className="self-stretch"
        >
          {t.components.account.RegisterPanel.register}
        </Button>
      </div>
    </form>
  )
}
