import { Button, NonIdealState } from '@blueprintjs/core'

import { ComponentType } from 'react'

import { useFollowList } from '../apis/follow'
import { UserCard } from '../components/UserCard'
import { useTranslation } from '../i18n/i18n'

const _FollowingPage: ComponentType = () => {
  const t = useTranslation()

  const { users, total, setSize, isValidating, isReachingEnd } = useFollowList({
    type: 'following',
    size: 20,
    suspense: true,
  })

  if (!users) throw new Error('unreachable')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-6">
        {t.pages.following.title} ({total})
      </h2>

      {/* User list */}
      {users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        isReachingEnd && (
          <NonIdealState
            icon="slash"
            title={t.pages.following.empty_title}
            description={t.pages.following.empty_description}
          />
        )
      )}

      {/* Reached end */}
      {isReachingEnd && users.length > 0 && (
        <div className="mt-8 w-full tracking-wider text-center select-none text-slate-500">
          {t.pages.followCommon.no_more}
        </div>
      )}

      {/* Load more */}
      {!isReachingEnd && (
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
  )
}

_FollowingPage.displayName = 'FollowingPage'

export const FollowingPage = _FollowingPage
