import { FC, ReactNode } from 'react'

import { ReLink } from './ReLink'

interface UserNameProps {
  className?: string
  userId: string
  children: ReactNode
}

export const UserName: FC<UserNameProps> = ({ className, userId, children }) => {
  return (
    <ReLink className={className} to={`/profile/${userId}`}>
      {children}
    </ReLink>
  )
}
