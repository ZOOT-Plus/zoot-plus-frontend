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
  size?: 'small' | 'medium' | 'large' | 'verylarge'
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
      verylarge: 'h-12 w-12',
    }[size]

  const colorClassName =
    rarity === 6
      ? 'bg-orange-200 ring-orange-300'
      : rarity === 5
        ? 'bg-yellow-100 ring-yellow-200'
        : rarity === 4
          ? 'bg-purple-100 ring-purple-200'
          : 'bg-slate-100 ring-slate-200'

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
        'flex items-center justify-center font-bold text-2xl text-slate-300 truncate select-none',
        className,
      )}
    >
      <div className="min-w-0">{fallback}</div>
    </div>
  )
}
