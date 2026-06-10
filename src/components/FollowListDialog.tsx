import { Button, Dialog, NonIdealState, Spinner } from '@blueprintjs/core'

import { ComponentType } from 'react'

import { useFollowList } from '../apis/follow'
import { UserCard } from './UserCard'
import { useTranslation } from '../i18n/i18n'

export const FollowListDialog: ComponentType<{
  isOpen: boolean
  onClose: () => void
  type: 'following' | 'fans'
}> = ({ isOpen, onClose, type }) => {
  const t = useTranslation()

  const { users, total, setSize, isValidating, isReachingEnd, isLoading } = useFollowList({
    type,
    size: 20,
  })

  const title = type === 'following' ? t.pages.following.title : t.pages.fans.title

  return (
    <Dialog
      title={`${title} (${total ?? 0})`}
      icon="people"
      isOpen={isOpen}
      onClose={onClose}
      canOutsideClickClose
      className="w-[600px] max-w-[90vw]"
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : (
          isReachingEnd && (
            <NonIdealState
              icon="slash"
              title={type === 'following' ? t.pages.following.empty_title : t.pages.fans.empty_title}
              description={type === 'following' ? t.pages.following.empty_description : t.pages.fans.empty_description}
            />
          )
        )}

        {!isLoading && users && users.length > 0 && isReachingEnd && (
          <div className="mt-8 w-full tracking-wider text-center select-none text-slate-500">
            {t.pages.followCommon.no_more}
          </div>
        )}

        {!isLoading && !isReachingEnd && (
          <Button
            loading={isValidating}
            text={t.pages.followCommon.load_more}
            icon="more"
            className="mt-4"
            large
            fill
            onClick={() => setSize((size) => size + 1)}
          />
        )}
      </div>
    </Dialog>
  )
}
