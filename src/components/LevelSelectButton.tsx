import { Button, Overlay } from '@blueprintjs/core'
import clsx from 'clsx'
import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
  // 记录上一次筛选的游戏/分类，便于下次弹层回显
  const [lastFilterMeta, setLastFilterMeta] = useState<{ game?: string; catOne?: string }>()
  // 暂存用户在弹层内的选择（不立即提交），点击“搜索”后再触发外部回调
  const [pendingStageId, setPendingStageId] = useState<string | undefined>()
  const [pendingKeyword, setPendingKeyword] = useState<string | undefined>()
  // 自定义浮层定位与容器
  const anchorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>()
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const updatePosition = () => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    setPortalContainer(overlayRef.current || undefined)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onResize = () => updatePosition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  // 仅当 value 是有效的 stageId 时，才认为已选择具体关卡
  const selected = useMemo<Level | undefined>(() => {
    if (!value) return undefined
    return levels.find((el) => el.stageId === value)
  }, [levels, value])

  const label = selected?.name?.trim() || selected?.stageId || t.components.LevelSelect.level

  return (
    <>
      <div ref={anchorRef} className="inline-block">
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

      <Overlay
        isOpen={open}
        onClose={() => setOpen(false)}
        canEscapeKeyClose={true}
        canOutsideClickClose={true}
        enforceFocus={false}
        autoFocus={false}
        usePortal
      >
        <div
          ref={overlayRef}
          className={clsx('bp4-card shadow-lg p-2 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-zinc-700','w-[900px] max-w-[95vw]')}
          // 提升悬浮层到页面最高层，确保子下拉永远在最上方
          style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 2147483000 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <LevelSelectV2
            // 仅向选择器传递合法的 stageId，避免将筛选关键字当作“自定义关卡”
            value={pendingStageId ?? selected?.stageId}
            // 当没有具体关卡时，使用上一次选择的筛选条件进行回显
            defaultGame={lastFilterMeta?.game}
            defaultCategory={lastFilterMeta?.catOne}
            portalContainer={portalContainer}
            onChange={(stageId) => {
              // 暂存关卡选择，不立即触发查询
              setPendingStageId(stageId)
              setPendingKeyword(undefined)
            }}
            onFilterChange={(kw, meta) => {
              // 暂存筛选关键字与上下文，不立即触发查询
              if (meta) setLastFilterMeta(meta)
              setPendingKeyword(kw)
              setPendingStageId(undefined)
            }}
          />
          <div className="flex justify-end mt-3">
            <Button
              intent="primary"
              small
              onClick={() => {
                if (pendingStageId) {
                  onChange(pendingStageId)
                } else if (pendingKeyword || lastFilterMeta) {
                  let kw = pendingKeyword ?? [lastFilterMeta?.game, lastFilterMeta?.catOne]
                    .filter(Boolean)
                    .join(' ')
                    .trim()
                  // 当选择的“游戏”为“如鸢/代号鸢”时，将“通用”一并纳入搜索关键字
                  const game = (lastFilterMeta?.game || '').trim()
                  if (!pendingKeyword && (game === '如鸢' || game === '代号鸢')) {
                    kw = [kw, '通用'].filter(Boolean).join(' ')
                  }
                  if (kw) {
                    onFilter?.(kw)
                  } else {
                    // 都为空则视为清空筛选
                    onChange('')
                  }
                } else {
                  onChange('')
                }
                // 提交后主动关闭弹层
                setOpen(false)
              }}
            >
              搜索
            </Button>
            <Button
              className="ml-2"
              small
              onClick={() => {
                // 清空所有选择与关键字
                setPendingStageId(undefined)
                setPendingKeyword(undefined)
                setLastFilterMeta(undefined)
                onFilter?.('')
                onChange('')
                setOpen(false)
              }}
            >
              重置
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}

LevelSelectButton.displayName = 'LevelSelectButton'
