import { Button, Popover } from '@blueprintjs/core'
import clsx from 'clsx'
import { FC, useMemo, useState } from 'react'

import { useLevels } from '../apis/level'
import { useTranslation } from '../i18n/i18n'
import { Level } from '../models/operation'
import { LevelSelect as LevelSelectV2 } from './editor2/LevelSelect'

interface Props {
  className?: string
  value?: string
  onChange: (stageId: string) => void
  onFilter?: (keyword: string) => void
}

// 一个按钮样式的 Level 选择器：
// - 外观保持为图标按钮
// - 弹出层内复用 v2 选择器，适配四层级（含 game）
export const LevelSelectButton: FC<Props> = ({ className, value, onChange, onFilter }) => {
  const t = useTranslation()
  const { data: levels } = useLevels()
  const [open, setOpen] = useState(false)

  const selected = useMemo<Level | undefined>(() => {
    if (!value) return undefined
    return levels.find((el) => el.stageId === value)
  }, [levels, value])

  const label = selected?.name?.trim() || selected?.stageId || t.components.LevelSelect.level

  return (
    <Popover
      minimal
      isOpen={open}
      onInteraction={(next) => setOpen(next)}
      content={
        <div className={clsx('p-2', 'w-[900px] max-w-[95vw]')}
          // 点击弹层外关闭
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <LevelSelectV2
            value={value}
            onChange={(stageId) => {
              onChange(stageId)
              // 保持悬浮窗开启，便于连续选择（游戏/分类/关卡）
            }}
            onFilterChange={(kw) => {
              onFilter?.(kw)
            }}
          />
        </div>
      }
    >
      <Button
        minimal
        className={clsx('!pl-3 !pr-2', className)}
        icon="area-of-interest"
        rightIcon="chevron-down"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
    </Popover>
  )
}

LevelSelectButton.displayName = 'LevelSelectButton'
