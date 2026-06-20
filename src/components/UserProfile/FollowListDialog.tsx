import { Button, Dialog, NonIdealState } from '@blueprintjs/core'

import { ComponentType, UIEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useFollowList, isFollowListTypeKey } from '../../apis/follow'
import { useTranslation } from '../../i18n/i18n'
import { useSWRClear } from '../../utils/swr'
import { UserCard } from '../UserCard'
import { UserListSkeleton } from './UserListSkeleton'

const ESTIMATED_USER_CARD_HEIGHT = 88
const OVERSCAN = 5
const MAX_LIST_HEIGHT = 600

export const FollowListDialog: ComponentType<{
  isOpen: boolean
  onClose: () => void
  type: 'following' | 'fans'
  disabled?: boolean
}> = ({ isOpen, onClose, type, disabled }) => {
  const t = useTranslation()
  const clearCache = useSWRClear()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(MAX_LIST_HEIGHT)

  const { users, total, error, setSize, isValidating, isReachingEnd, isLoading } = useFollowList({
    type,
    size: 20,
    disabled: disabled || !isOpen,
  })

  const title = type === 'following' ? t.pages.following.title : t.pages.fans.title
  const totalListHeight = users.length * ESTIMATED_USER_CARD_HEIGHT
  const { startIndex, virtualUsers } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_USER_CARD_HEIGHT) - OVERSCAN)
    const end = Math.min(users.length, Math.ceil((scrollTop + viewportHeight) / ESTIMATED_USER_CARD_HEIGHT) + OVERSCAN)

    return {
      startIndex: start,
      virtualUsers: users.slice(start, end),
    }
  }, [scrollTop, users, viewportHeight])

  useEffect(() => {
    setScrollTop(0)

    if (!isOpen) return

    const frame = window.requestAnimationFrame(() => {
      if (parentRef.current) {
        parentRef.current.scrollTop = 0
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, type])

  useEffect(() => {
    if (!isOpen) return

    const element = parentRef.current
    if (!element) return

    const updateHeight = () => {
      setViewportHeight(element.clientHeight || MAX_LIST_HEIGHT)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)

    return () => observer.disconnect()
  }, [isOpen])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }

  const handleClose = () => {
    clearCache((key) => isFollowListTypeKey(key, type))
    onClose()
  }

  return (
    <Dialog
      title={`${title} (${total ?? 0})`}
      icon="people"
      isOpen={isOpen}
      onClose={handleClose}
      canOutsideClickClose
      className="w-[600px] max-w-[90vw]"
    >
      <div className="p-4">
        {isLoading ? (
          <UserListSkeleton />
        ) : error && users.length === 0 ? (
          <NonIdealState
            icon="error"
            title={t.pages.followCommon.error_title}
            description={t.pages.followCommon.error_description}
          />
        ) : users && users.length > 0 ? (
          <div ref={parentRef} className="max-h-[600px] overflow-auto pr-1" onScroll={handleScroll}>
            <div
              style={{
                height: totalListHeight,
                position: 'relative',
              }}
            >
              {virtualUsers.map((user, offset) => {
                const index = startIndex + offset

                return (
                  <div
                    key={user.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: ESTIMATED_USER_CARD_HEIGHT,
                      paddingBottom: 16,
                      transform: `translateY(${index * ESTIMATED_USER_CARD_HEIGHT}px)`,
                    }}
                  >
                    <UserCard user={user} />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <NonIdealState
            icon="slash"
            title={type === 'following' ? t.pages.following.empty_title : t.pages.fans.empty_title}
            description={type === 'following' ? t.pages.following.empty_description : t.pages.fans.empty_description}
          />
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
