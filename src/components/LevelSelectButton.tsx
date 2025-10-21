import { Button } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC, useMemo, useState } from 'react'

import { useLevels } from '../apis/level'
import { useTranslation } from '../i18n/i18n'
import { Level } from '../models/operation'
import LevelSelectDialog from './editor2/LevelSelectDialog'

interface Props {
  className?: string
  value?: string
  onChange: (stageId: string) => void
  onFilter?: (keyword: string) => void
  // 外部默认 game（如首页快捷筛选触发时传入）
  defaultGame?: string
}

// 一个按钮样式的 Level 选择器：
// - 外观保持为图标按钮
// - 弹出层内复用 v2 选择器，适配四层级（含 game）
export const LevelSelectButton: FC<Props> = ({
  className,
  value,
  onChange,
  onFilter,
  defaultGame,
}) => {
  const t = useTranslation()
  const { data: levels } = useLevels()
  const [open, setOpen] = useState(false)

  // 仅当 value 是有效的 stageId 时，才认为已选择具体关卡
  const selected = useMemo<Level | undefined>(() => {
    if (!value) return undefined
    return levels.find((el) => el.stageId === value)
  }, [levels, value])

  const label =
    selected?.name?.trim() ||
    selected?.stageId ||
    t.components.LevelSelect.level

  return (
    <>
      <div className="inline-block">
        <Button
          minimal
          className={clsx('!pl-3 !pr-2', className)}
          icon="area-of-interest"
          rightIcon="chevron-down"
          onClick={() => setOpen((v) => !v)}
        >
          {label}
        </Button>
      </div>

      <LevelSelectDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        onFilter={onFilter}
        defaultGame={defaultGame}
      />
    </>
  )
}

LevelSelectButton.displayName = 'LevelSelectButton'
