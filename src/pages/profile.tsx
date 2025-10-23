import { Button, ButtonGroup, Card } from '@blueprintjs/core'

import { useAtom } from 'jotai'
import { ComponentType, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { OperationList } from 'components/OperationList'
import { OperationSetList } from 'components/OperationSetList'
import { OperationDrawer } from 'components/drawer/OperationDrawer'
import { authAtom } from 'store/auth'

import { useUserInfo } from '../apis/user'
import { CardTitle } from '../components/CardTitle'
import { withSuspensable } from '../components/Suspensable'
import { useTranslation } from '../i18n/i18n'
import { NotFoundError } from '../utils/error'

const _ProfilePage: ComponentType = () => {
  const t = useTranslation()
  const { id } = useParams()
  if (!id) {
    // edge case?
    throw new Error(t.pages.profile.invalid_id)
  }

  const { data: userInfo } = useUserInfo({ userId: id, suspense: true })

  const [authState, _setAuthState] = useAtom(authAtom)

  const [listMode, setListMode] = useState<'operation' | 'operationSet'>(
    'operation',
  )
  const [operationCount, setOperationCount] = useState(-1)
  const [operationSetCount, setOperationSetCount] = useState(-1)

  return (
    <div className="flex flex-col md:flex-row px-8 pb-16 mt-8 max-w-[96rem] mx-auto">
      <div className="md:w-2/3 order-2 md:order-1 mr-0 md:mr-8">
        <div className="mb-4 flex flex-wrap">
          <ButtonGroup className="mr-2">
            <Button
              icon="document"
              active={listMode === 'operation'}
              onClick={() => setListMode('operation')}
            >
              {t.pages.profile.tasks}
              {operationCount === -1 ? '' : ` (${operationCount})`}
            </Button>
            <Button
              icon="folder-close"
              active={listMode === 'operationSet'}
              onClick={() => setListMode('operationSet')}
            >
              {t.pages.profile.task_sets}
              {operationSetCount === -1 ? '' : ` (${operationSetCount})`}
            </Button>
          </ButtonGroup>
        </div>

        <div className="tabular-nums">
          {listMode === 'operation' && (
            <OperationList
              limit={10}
              orderBy="id"
              uploaderId={authState.userId === id ? 'me' : id}
              onUpdate={({ total }) => setOperationCount(total)}
            />
          )}
          {listMode === 'operationSet' && (
            <OperationSetList
              creatorId={id}
              onUpdate={({ total }) => setOperationSetCount(total)}
            />
          )}
        </div>
      </div>
      <div className="md:w-1/3 order-1 md:order-2">
        <div className="sticky top-20">
          <Card className="flex flex-col mb-4 space-y-2">
            <CardTitle icon="user">{userInfo?.userName}</CardTitle>
          </Card>
        </div>
      </div>

      <OperationDrawer />
    </div>
  )
}
_ProfilePage.displayName = 'ProfilePage'

export const ProfilePage = withSuspensable(_ProfilePage, {
  errorFallback: ({ error }) => {
    if (error instanceof NotFoundError) {
      return <Navigate to="/404" replace />
    }
    return undefined
  },
})
