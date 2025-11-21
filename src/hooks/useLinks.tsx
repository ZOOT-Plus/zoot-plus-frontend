import { useTranslation } from '../i18n/i18n'
import { FRIENDLY_LINKS_CONFIG, NAV_CONFIG, SOCIAL_CONFIG } from '../links'

export const useLinks = () => {
  useTranslation()

  const NAV_LINKS = NAV_CONFIG.map(({ to, labelKey, icon }) => ({
    to,
    label: labelKey(),
    icon,
  }))

  const SOCIAL_LINKS = SOCIAL_CONFIG.map(({ icon, href, labelKey }) => ({
    icon,
    href,
    label: labelKey(),
  }))

  const FRIENDLY_LINKS = FRIENDLY_LINKS_CONFIG.map(
    ({ icon, href, labelKey }) => ({
      icon,
      href,
      label: labelKey(),
    }),
  )

  return { NAV_LINKS, SOCIAL_LINKS, FRIENDLY_LINKS }
}
