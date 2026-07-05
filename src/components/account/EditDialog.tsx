import { Button, Callout, Dialog, Icon, Tab, TabId, Tabs } from '@blueprintjs/core'

import { updatePassword, updateUserInfo } from 'apis/auth'
import { useAtom } from 'jotai'
import { FC, useEffect, useState } from 'react'
import { FieldErrors, useForm } from 'react-hook-form'
import { useLatest } from 'react-use'

import { AppToaster } from 'components/Toaster'

import { useTranslation } from '../../i18n/i18n'
import { authAtom } from '../../store/auth'
import { formatError } from '../../utils/error'
import { GlobalErrorBoundary } from '../GlobalErrorBoundary'
import { AuthFormPasswordField, AuthFormUsernameField } from './AuthFormShared'
import { ResetPasswordDialog } from './ResetPasswordDialog'

interface EditDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const EditDialog: FC<EditDialogProps> = ({ isOpen, onClose }) => {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('info')

  return (
    <Dialog title={t.components.account.EditDialog.edit_account_info} icon="user" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 pt-2">
        <GlobalErrorBoundary>
          <Tabs
            // renderActiveTabPanelOnly: avoid autocomplete on inactive panel
            renderActiveTabPanelOnly={true}
            id="account-edit-tabs"
            onChange={(tab) => {
              setActiveTab(tab)
            }}
            selectedTabId={activeTab}
          >
            <Tab
              id="info"
              title={
                <div>
                  <Icon icon="manually-entered-data" />
                  <span className="ml-1">{t.components.account.EditDialog.account_info}</span>
                </div>
              }
              panel={<InfoPanel onClose={onClose} />}
            />
            <Tab
              id="password"
              title={
                <div>
                  <Icon icon="key" />
                  <span className="ml-1">{t.components.account.EditDialog.password}</span>
                </div>
              }
              panel={<PasswordPanel onClose={onClose} />}
            />
          </Tabs>
        </GlobalErrorBoundary>
      </div>
    </Dialog>
  )
}

const InfoPanel = ({ onClose }) => {
  const t = useTranslation()

  interface FormValues {
    username: string
  }

  const [auth, setAuth] = useAtom(authAtom)

  const latestAuth = useLatest(auth)

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: auth,
  })

  useEffect(() => {
    reset(auth)
  }, [auth, reset])

  const globalError = (errors as FieldErrors<{ global: void }>).global?.message

  const onSubmit = handleSubmit(async ({ username }) => {
    try {
      await updateUserInfo({ username })

      setAuth({
        ...latestAuth.current,
        username,
      })

      AppToaster.show({
        intent: 'success',
        message: t.components.account.EditDialog.update_success,
      })
      onClose(false)
    } catch (e) {
      console.warn(e)
      setError('global' as any, { message: formatError(e) })
    }
  })

  return (
    <form>
      {globalError && (
        <Callout intent="danger" icon="error" title={t.components.account.EditDialog.error}>
          {globalError}
        </Callout>
      )}

      <AuthFormUsernameField control={control} error={errors.username} field="username" />

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
          {t.components.account.EditDialog.save}
        </Button>
      </div>
    </form>
  )
}

const PasswordPanel = ({ onClose }) => {
  const t = useTranslation()

  interface FormValues {
    original: string
    newPassword: string
    newPassword2: string
  }

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>()

  const globalError = (errors as FieldErrors<{ global: void }>).global?.message

  const onSubmit = handleSubmit(async ({ original, newPassword, newPassword2 }) => {
    if (newPassword !== newPassword2) {
      setError('newPassword2', {
        message: t.components.account.EditDialog.passwords_dont_match,
      })
      return
    }

    try {
      await updatePassword({ originalPassword: original, newPassword })

      AppToaster.show({
        intent: 'success',
        message: t.components.account.EditDialog.update_success,
      })
      onClose(false)
    } catch (e) {
      console.warn(e)
      setError('global' as any, { message: formatError(e) })
    }
  })

  return (
    <>
      <form>
        {globalError && (
          <Callout intent="danger" icon="error" title={t.components.account.EditDialog.error}>
            {globalError}
          </Callout>
        )}

        <AuthFormPasswordField
          label={t.components.account.EditDialog.current_password}
          field="original"
          control={control}
          error={errors.original}
        />
        <AuthFormPasswordField
          label={t.components.account.EditDialog.new_password}
          field="newPassword"
          control={control}
          error={errors.newPassword}
          autoComplete="off"
        />
        <AuthFormPasswordField
          label={t.components.account.EditDialog.confirm_new_password}
          field="newPassword2"
          control={control}
          error={errors.newPassword2}
          autoComplete="off"
        />

        <div className="mt-6 flex justify-end">
          <Button minimal className="mr-2" icon="key" onClick={() => setResetPasswordDialogOpen(true)}>
            {t.components.account.EditDialog.forgot_password}
          </Button>
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
            {t.components.account.EditDialog.save}
          </Button>
        </div>
      </form>

      <ResetPasswordDialog isOpen={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)} />
    </>
  )
}
