import {
  Alert,
  Button,
  Dialog,
  H4,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  Position,
  Tab,
  TabId,
  Tabs,
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import { useAtom } from 'jotai'
import { ComponentType, FC, useState } from 'react'

import { LoginPanel } from 'components/account/LoginPanel'
import { authAtom } from 'store/auth'
import { useCurrentSize } from 'utils/useCurrenSize'

import { useTranslation } from '../i18n/i18n'
import {
  GlobalErrorBoundary,
  withGlobalErrorBoundary,
} from './GlobalErrorBoundary'
import { AppToaster } from './Toaster'
import { EditDialog } from './account/EditDialog'
import { RegisterPanel } from './account/RegisterPanel'

const AccountMenu: FC = () => {
  const t = useTranslation()
  const [authState, setAuthState] = useAtom(authAtom)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { isSM } = useCurrentSize()

  const handleLogout = () => {
    setAuthState({})
    AppToaster.show({
      intent: 'success',
      message: t.components.AccountManager.logout_success,
    })
  }

  return (
    <>
      <Alert
        isOpen={logoutDialogOpen}
        cancelButtonText={t.components.AccountManager.cancel}
        confirmButtonText={t.components.AccountManager.logout}
        icon="log-out"
        intent="danger"
        canOutsideClickCancel
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      >
        <H4>{t.components.AccountManager.logout}</H4>
        <p>{t.components.AccountManager.logout_confirm}</p>
      </Alert>

      <EditDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />

      <Menu>
        {!authState.activated && (
          <MenuItem
            disabled
            icon="warning-sign"
            text={t.components.AccountManager.account_not_activated}
          />
        )}

        <MenuItem
          icon="person"
          text={
            (isSM ? authState.username + ' - ' : '') +
            t.components.AccountManager.profile
          }
          href={`/profile/${authState.userId}`}
        />
        <MenuItem
          shouldDismissPopover={false}
          icon="edit"
          text={t.components.AccountManager.edit_info}
          onClick={() => setEditDialogOpen(true)}
        />
        <MenuDivider />

        <MenuItem
          shouldDismissPopover={false}
          intent="danger"
          icon="log-out"
          text={t.components.AccountManager.logout}
          onClick={() => setLogoutDialogOpen(true)}
        />
      </Menu>
    </>
  )
}

export const AccountAuthDialog: ComponentType<{
  open?: boolean
  onClose?: () => void
}> = withGlobalErrorBoundary(({ open, onClose }) => {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('login')

  return (
    <Dialog
      title={t.components.AccountManager.maa_account}
      icon="user"
      isOpen={open}
      onClose={onClose}
    >
      <div className="flex flex-col p-4 pt-2">
        <GlobalErrorBoundary>
          <Tabs
            // renderActiveTabPanelOnly: avoid autocomplete on inactive panel
            renderActiveTabPanelOnly={true}
            id="account-auto-tabs"
            onChange={(tab) => {
              setActiveTab(tab)
            }}
            selectedTabId={activeTab}
          >
            <Tab
              id="login"
              title={
                <div>
                  <Icon icon="person" />
                  <span className="ml-1">
                    {t.components.AccountManager.login}
                  </span>
                </div>
              }
              panel={
                <LoginPanel
                  onNavigateRegisterPanel={() => setActiveTab('register')}
                  onComplete={() => onClose?.()}
                />
              }
            />
            <Tab
              id="register"
              title={
                <div>
                  <Icon icon="new-person" />
                  <span className="ml-1">
                    {t.components.AccountManager.register}
                  </span>
                </div>
              }
              panel={<RegisterPanel onComplete={() => setActiveTab('login')} />}
            />
          </Tabs>
        </GlobalErrorBoundary>
      </div>
    </Dialog>
  )
})

export const AccountManager: ComponentType = withGlobalErrorBoundary(() => {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const [authState] = useAtom(authAtom)
  const shrinked = useCurrentSize().isLG

  return (
    <>
      <AccountAuthDialog open={open} onClose={() => setOpen(false)} />
      {authState.token ? (
        // BUTTOM_RIGHT设置防止弹出框撑大body超过100vw
        <Popover2 content={<AccountMenu />} position={Position.BOTTOM_RIGHT}>
          <Button
            icon="user"
            text={!shrinked && authState.username}
            rightIcon="caret-down"
          />
        </Popover2>
      ) : (
        <Button className="ml-auto" icon="user" onClick={() => setOpen(true)}>
          {!shrinked && t.components.AccountManager.login_register}
        </Button>
      )}
    </>
  )
})
