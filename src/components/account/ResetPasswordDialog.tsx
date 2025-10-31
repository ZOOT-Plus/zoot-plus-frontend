import { Button, Callout, Dialog, InputGroup } from '@blueprintjs/core'

import { resetPassword, sendResetPasswordEmail } from 'apis/auth'
import { FC, useState } from 'react'
import { FieldErrors, useForm } from 'react-hook-form'

import { useTranslation } from '../../i18n/i18n'
import { formatError } from '../../utils/error'
import { useNetworkState } from '../../utils/useNetworkState'
import { wrapErrorMessage } from '../../utils/wrapErrorMessage'
import { FormField } from '../FormField'
import { GlobalErrorBoundary } from '../GlobalErrorBoundary'
import { AppToaster } from '../Toaster'
import { AuthFormEmailField, AuthFormPasswordField } from './AuthFormShared'

interface ResetPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface FormValues {
  email: string
  token: string
  password: string
}

export const ResetPasswordDialog: FC<ResetPasswordDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation()

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>()

  const globalError = (errors as FieldErrors<{ global: void }>).global?.message

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword({
        email: values.email,
        activeCode: values.token,
        password: values.password,
      })

      AppToaster.show({
        intent: 'success',
        message: t.components.account.ResetPasswordDialog.reset_success,
      })
      onClose()
    } catch (e) {
      console.warn(e)
      setError('global' as any, { message: formatError(e) })
    }
  })

  return (
    <Dialog
      usePortal={true}
      title={t.components.account.ResetPasswordDialog.reset_password}
      icon="key"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="p-4 pt-2">
        <GlobalErrorBoundary>
          <form>
            {globalError && (
              <Callout
                intent="danger"
                icon="error"
                title={t.components.account.ResetPasswordDialog.error}
              >
                {globalError}
              </Callout>
            )}

            <AuthFormEmailField
              field="email"
              control={control}
              error={errors.email}
              inputGroupProps={({ field, fieldState }) => ({
                rightElement: (
                  <RequestTokenButton
                    email={field.value}
                    disabled={!!fieldState.error}
                  />
                ),
              })}
            />

            <FormField
              label={t.components.account.ResetPasswordDialog.verification_code}
              field="token"
              control={control}
              error={errors.token}
              ControllerProps={{
                rules: {
                  required:
                    t.components.account.ResetPasswordDialog.code_required,
                },
                render: ({ field: { value, ...binding } }) => (
                  <InputGroup
                    id="token"
                    value={value || ''}
                    placeholder={
                      t.components.account.ResetPasswordDialog.enter_email_code
                    }
                    {...binding}
                  />
                ),
              }}
            />

            <AuthFormPasswordField
              field="password"
              control={control}
              error={errors.password}
            />

            <div className="mt-6 flex justify-end">
              <Button
                disabled={!isDirty || isSubmitting}
                intent="primary"
                loading={isSubmitting}
                type="submit"
                icon="floppy-disk"
                onClick={(e) => {
                  // manually clear the `global` error or else the submission will be blocked
                  clearErrors()
                  onSubmit(e)
                }}
              >
                {t.components.account.ResetPasswordDialog.save}
              </Button>
            </div>
          </form>
        </GlobalErrorBoundary>
      </div>
    </Dialog>
  )
}

const RequestTokenButton = ({
  email,
  disabled,
}: {
  email: string
  disabled: boolean
}) => {
  const t = useTranslation()
  const { networkState, start, finish } = useNetworkState()
  const [sent, setSent] = useState(false)

  const handleClick = () => {
    start()
    wrapErrorMessage(
      (e) =>
        t.components.account.ResetPasswordDialog.get_code_failed({
          error: formatError(e),
        }),
      sendResetPasswordEmail({ email }),
    )
      .then(() => {
        finish(null)
        setSent(true)
        AppToaster.show({
          message: t.components.account.ResetPasswordDialog.code_sent,
          intent: 'success',
        })
      })
      .catch((e) => finish(e))
  }

  return (
    <Button
      small
      minimal
      icon={sent ? 'refresh' : 'envelope'}
      disabled={disabled || !email}
      onClick={handleClick}
      loading={networkState.loading}
    >
      {sent
        ? t.components.account.ResetPasswordDialog.resend
        : t.components.account.ResetPasswordDialog.get_code}
    </Button>
  )
}
