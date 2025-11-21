import { Drawer, Menu, MenuDivider } from '@blueprintjs/core'
import { MenuItem2 } from '@blueprintjs/popover2'

import { useLinks } from 'hooks/useLinks'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { navAtom, toggleExpandNavAtom } from 'store/nav'

import { useTranslation } from '../../i18n/i18n'
import { useCurrentSize } from '../../utils/useCurrenSize'
import { AnnPanel } from '../announcement/AnnPanel'
import { OperationSetEditorDialog } from '../operation-set/OperationSetEditor'

export const NavAside = () => {
  const t = useTranslation()
  const { isMD } = useCurrentSize()
  const nav = useAtomValue(navAtom)
  const toggleNav = useSetAtom(toggleExpandNavAtom)

  const [showOperationSetDialog, setShowOperationSetDialog] = useState(false)

  const { NAV_LINKS, SOCIAL_LINKS, FRIENDLY_LINKS } = useLinks()

  if (!isMD) return null

  return (
    <>
      <Drawer
        isOpen={isMD && !!nav.expanded}
        onClose={() => toggleNav()}
        position="left"
        size="100%"
        portalClassName="[&>.bp4-overlay-container]:z-10"
        backdropClassName="bg-transparent"
        className="bg-transparent backdrop-blur-lg overflow-y-auto mt-14 p-2"
      >
        <Menu className="p-0 space-y-2 bg-transparent font-bold">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className="block !no-underline">
              {({ isActive }) => (
                <MenuItem2
                  key={link.to}
                  icon={link.icon}
                  active={isActive}
                  text={link.label}
                  className="p-2 rounded-md"
                  tagName="div"
                  onClick={() => toggleNav()}
                />
              )}
            </NavLink>
          ))}
          <MenuDivider />
          <MenuItem2
            icon="folder-new"
            text={t.components.drawer.NavAside.create_job_set}
            className="p-2 rounded-md"
            onClick={() => {
              setShowOperationSetDialog(true)
              toggleNav()
            }}
          />
          <AnnPanel
            trigger={({ handleClick }) => (
              <MenuItem2
                icon="info-sign"
                text={t.components.drawer.NavAside.announcement}
                className="p-2 rounded-md"
                onClick={handleClick}
              />
            )}
          />
          <MenuDivider />
        </Menu>
        <div className="flex flex-wrap leading-relaxed mt-2 p-2 section-social-links">
          {SOCIAL_LINKS.map((link) => (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-zinc-600 dark:text-slate-100 no-underline"
            >
              {link.icon}
              <span>{link.label}</span>
            </a>
          )).reduce((prev, curr) => (
            <>
              {prev}
              <div className="mx-2 opacity-50">·</div>
              {curr}
            </>
          ))}
        </div>
        <div className="mt-2 p-2">
          <div className="text-sm font-medium text-zinc-600 dark:text-slate-100 mb-2">
            {t.links.friendly_links}
          </div>
          <div className="flex flex-wrap leading-relaxed mb-2 section-social-links">
            {FRIENDLY_LINKS.map((link) => (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-zinc-600 dark:text-slate-100 no-underline"
              >
                {link.icon}
                <span>{link.label}</span>
              </a>
            )).reduce((prev, curr) => (
              <>
                {prev}
                <div className="mx-2 opacity-50">·</div>
                {curr}
              </>
            ))}
          </div>
        </div>
      </Drawer>

      <OperationSetEditorDialog
        isOpen={showOperationSetDialog}
        onClose={() => setShowOperationSetDialog(false)}
      />
    </>
  )
}
