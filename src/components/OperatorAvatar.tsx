import clsx from 'clsx'
import { ReactNode } from 'react'

import {
  OperatorInfo,
  findOperatorById,
  findOperatorByName,
} from '../models/operator'

interface OperatorAvatarProps {
  id?: string
  name?: string
  rarity?: number
  size?: 'small' | 'medium' | 'large'
  sourceSize?: 32 | 96
  fallback?: ReactNode
  className?: string
}

export function OperatorAvatar({
  id,
  name,
  rarity,
  size,
  fallback = '?',
  className,
  sourceSize = 32,
}: OperatorAvatarProps) {
  let info: OperatorInfo | undefined
  if (id) {
    info = findOperatorById(id)
    name = info?.name
  } else if (name) {
    info = findOperatorByName(name)
    id = info?.id
  }
  rarity ??= info?.rarity

  const sizingClassName =
    size &&
    {
      small: 'h-5 w-5',
      medium: 'h-6 w-6',
      large: 'h-8 w-8',
    }[size]

  const colorClassName =
    rarity === 6
      ? 'bg-orange-200 ring-orange-300 dark:bg-orange-600/20 dark:ring-orange-500/60'
      : rarity === 5
        ? 'bg-yellow-100 ring-yellow-200 dark:bg-yellow-500/20 dark:ring-yellow-500/60'
        : rarity === 4
          ? 'bg-purple-100 ring-purple-200 dark:bg-purple-600/20 dark:ring-purple-500/60'
          : 'bg-slate-100 ring-slate-200 dark:bg-[#2d2d30] dark:ring-[#3f3f46]'

  const commonClassName =
    'ring-inset ring-2 border-solid rounded-md object-cover'

  return id ? (
    <img
      className={clsx(
        sizingClassName,
        colorClassName,
        commonClassName,
        className,
      )}
      src={`/assets/operator-avatars/webp${sourceSize}/${id}.webp`}
      alt={name || id}
      // lazy 要配合 width 和 height 使用，不然图片提前很多就加载了
      loading="lazy"
      width={sourceSize}
      height={sourceSize}
    />
  ) : (
    <div
      className={clsx(
        sizingClassName,
        colorClassName,
        commonClassName,
        'flex items-center justify-center font-bold text-2xl text-slate-300 dark:text-zinc-600 truncate select-none',
        className,
      )}
    >
      <div className="min-w-0">{fallback}</div>
    </div>
  )
}
