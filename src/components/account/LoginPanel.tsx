import { Button } from '@blueprintjs/core'

import { login } from 'apis/auth'
import { useSetAtom } from 'jotai'
import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'

import { AppToaster } from 'components/Toaster'
import { authAtom, fromCredentials } from 'store/auth'
import { formatError } from 'utils/error'
import { wrapErrorMessage } from 'utils/wrapErrorMessage'

import { useTranslation } from '../../i18n/i18n'
import { AuthFormEmailField, AuthFormPasswordField } from './AuthFormShared'
import { ResetPasswordDialog } from './ResetPasswordDialog'

export interface LoginFormValues {
  email: string
  password: string
}

export const LoginPanel: FC<{
  onNavigateRegisterPanel: () => void
  onComplete: () => void
}> = ({ onNavigateRegisterPanel, onComplete }) => {
  const t = useTranslation()
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
  } = useForm<LoginFormValues>({ mode: 'onChange' })
  const setAuthState = useSetAtom(authAtom)

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    try {
      const res = await wrapErrorMessage(
        (e) =>
          t.components.account.LoginPanel.login_failed({
            error: formatError(e),
          }),
        login({ email, password }),
      )
      setAuthState(fromCredentials(res))
      AppToaster.show({
        intent: 'success',
        message: t.components.account.LoginPanel.login_success({
          name: res.userInfo.userName,
        }),
      })
      onComplete()
    } catch {
      // Error handled by wrapErrorMessage (toast shown), prevent isSubmitting from getting stuck
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <AuthFormEmailField
          control={control}
          error={errors.email}
          field="email"
        />

        <AuthFormPasswordField<LoginFormValues>
          control={control}
          error={errors.password}
          field="password"
          inputGroupProps={() => ({
            rightElement: (
              <Button
                minimal
                small
                icon="key"
                onClick={() => setResetPasswordDialogOpen(true)}
              >
                {t.components.account.LoginPanel.forgot_password}
              </Button>
            ),
          })}
        />

        <div className="mt-6 flex items-center">
          <span className="text-zinc-500">
            {t.components.account.LoginPanel.no_account}
          </span>
          <Button minimal onClick={onNavigateRegisterPanel}>
            {t.components.account.LoginPanel.go_register}
          </Button>

          <div className="flex-1" />

          <Button
            disabled={!isValid || isSubmitting}
            intent="primary"
            loading={isSubmitting}
            type="submit"
            icon="log-in"
            className="self-stretch"
          >
            {t.components.account.LoginPanel.login}
          </Button>
        </div>
      </form>

      <ResetPasswordDialog
        isOpen={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
      />
    </>
  )
}
