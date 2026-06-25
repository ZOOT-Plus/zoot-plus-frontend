import { Card, Classes } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC } from 'react'

const SkeletonBlock: FC<{ className: string }> = ({ className }) => (
  <div className={clsx(Classes.SKELETON, className)} />
)

export const UserCardSkeleton: FC = () => (
  <Card className="flex items-center space-x-3">
    <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
    <div className="flex-1">
      <SkeletonBlock className="mb-2 h-4 w-32 max-w-full" />
      <SkeletonBlock className="h-3 w-24 max-w-full" />
    </div>
    <SkeletonBlock className="h-8 w-20 shrink-0" />
  </Card>
)

export const UserListSkeleton: FC = () => (
  <div className="space-y-4">
    <UserCardSkeleton />
    <UserCardSkeleton />
    <UserCardSkeleton />
  </div>
)
