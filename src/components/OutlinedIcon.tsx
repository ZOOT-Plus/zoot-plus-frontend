import { Icon, IconProps } from '@blueprintjs/core'

import clsx from 'clsx'

export const OutlinedIcon = ({
  className,
  outlined = true,
  ...iconProps
}: IconProps & {
  // default is true, set to false to disable the outline effect
  outlined?: boolean
}) => (
  <Icon
    {...iconProps}
    className={clsx(className, (outlined ?? true) && '[&_path]:fill-transparent [&_path]:stroke-current')}
  />
)
