import { Card, Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC, ReactNode, useEffect, useMemo, useState } from 'react'

import { useAnnouncement } from '../../apis/announcement'
import { useTranslation } from '../../i18n/i18n'
import {
  AnnouncementSection,
  parseAnnouncement,
} from '../../models/announcement'
import { formatError } from '../../utils/error'
import { useLazyStorage } from '../../utils/useLazyStorage'
import { CardTitle } from '../CardTitle'
import { AnnDialog } from './AnnDialog'

const ENABLE_ANNOUNCEMENT = !['false', '0', 'off', 'disabled', 'no'].includes(
  String(import.meta.env.VITE_ENABLE_ANNOUNCEMENT ?? 'true').toLowerCase(),
)

interface AnnPanelProps {
  className?: string
  trigger?: (params: { handleClick: () => void }) => ReactNode
}

export const AnnPanel: FC<AnnPanelProps> = ({ className, trigger }) => {
  if (!ENABLE_ANNOUNCEMENT) return null
  const t = useTranslation()
  const { data, error } = useAnnouncement()
  const announcement = useMemo(
    () => (data ? parseAnnouncement(data) : undefined),
    [data],
  )
  const [lastNoticed, setLastNoticed] = useLazyStorage(
    'copilot-last-noticed',
    0,
  )
  const [displaySections, setDisplaySections] =
    useState<AnnouncementSection[]>()

  const [isOpen, setIsOpen] = useState<{ yes: boolean; manually: boolean }>()

  useEffect(() => {
    const freshSections = announcement?.sections.filter(
      ({ meta: { time, level } = {} }) =>
        level !== 'verbose' && +(time || 0) > lastNoticed,
    )

    if (freshSections?.length) {
      setIsOpen({ yes: true, manually: false })
      setDisplaySections(freshSections)
      setLastNoticed(Date.now())
    }
  }, [announcement, lastNoticed, setLastNoticed])

  const handleClick = () => {
    setIsOpen({ yes: true, manually: true })
    setDisplaySections(announcement?.sections)
  }

  trigger ??= ({ handleClick }) => (
    <Card interactive className={clsx(className)} onClick={handleClick}>
      <CardTitle icon="info-sign">
        {t.components.announcement.AnnPanel.title}
      </CardTitle>

      <div className="flex">
        {announcement && (
          <ul className="grow list-disc pl-4">
            {announcement?.sections
              .slice(0, 3)
              .map(({ title }) => <li key={title}>{title}</li>)}
          </ul>
        )}
        {!announcement && error && (
          <div className="grow text-red-500">
            {t.components.announcement.AnnPanel.load_failed({
              error: formatError(error),
            })}
          </div>
        )}
        <Icon className="self-end" icon="more" size={14} />
      </div>
    </Card>
  )

  return (
    <>
      {trigger({ handleClick })}
      <AnnDialog
        sections={displaySections}
        isOpen={!!isOpen?.yes}
        canOutsideClickClose={isOpen?.manually}
        onClose={() => setIsOpen(undefined)}
      />
    </>
  )
}
