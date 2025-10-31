import { useTranslation } from '../i18n/i18n'
import { useAtomValue } from 'jotai'
import { authAtom, isAdmin } from '../store/auth'
import { NAV_CONFIG, SOCIAL_CONFIG } from '../links'

export const useLinks = () => {
  useTranslation()
  const auth = useAtomValue(authAtom)

  const NAV_LINKS = NAV_CONFIG
    .filter((item: any) => !item?.requiresAdmin || isAdmin(auth))
    .map(({ to, labelKey, icon }) => ({
      to,
      label: labelKey(),
      icon,
    }))

  const SOCIAL_LINKS = SOCIAL_CONFIG.map(({ icon, href, labelKey }) => ({
    icon,
    href,
    label: labelKey(),
  }))

  return { NAV_LINKS, SOCIAL_LINKS }
}
