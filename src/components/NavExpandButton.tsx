import { Button } from '@blueprintjs/core'

import { useAtomValue, useSetAtom } from 'jotai'

import { navAtom, toggleExpandNavAtom } from 'store/nav'

export const NavExpandButton = () => {
  const { expanded = false } = useAtomValue(navAtom)
  const toggleExpand = useSetAtom(toggleExpandNavAtom)

  return (
    <Button
      className="md:!hidden"
      aria-expanded={expanded}
      onClick={() => toggleExpand()}
      icon="menu"
    />
  )
}
