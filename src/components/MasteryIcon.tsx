import { FC } from 'react'

interface MasteryIconProps extends React.SVGProps<SVGSVGElement> {
  mastery: number
  mainClassName?: string
  subClassName?: string
}

export const MasteryIcon: FC<MasteryIconProps> = ({
  mastery,
  mainClassName = 'fill-current',
  subClassName = 'fill-gray-300 dark:fill-gray-600',
  ...props
}) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
      <circle className={mastery >= 1 ? mainClassName : subClassName} cx="50" cy="27" r="22" />
      <circle className={mastery >= 2 ? mainClassName : subClassName} cx="75" cy="70" r="22" />
      <circle className={mastery >= 3 ? mainClassName : subClassName} cx="25" cy="70" r="22" />
    </svg>
  )
}
