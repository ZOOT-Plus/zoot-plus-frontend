import { Button, Dialog, DialogBody, DialogFooter, H6 } from '@blueprintjs/core'
import { FC, useMemo, useState } from 'react'

import { useLevels } from '../../apis/level'
import { useTranslation } from '../../i18n/i18n'
import { Level } from '../../models/operation'
import { LevelSelect as LevelSelectV2 } from './LevelSelect'

interface Props {
  isOpen: boolean
  onClose: () => void
  value?: string
  onChange: (stageId: string) => void
  onFilter?: (keyword: string) => void
  // 当外部有“当前 game”上下文（如首页快捷筛选）时，作为首选默认 game
  defaultGame?: string
}

export const LevelSelectDialog: FC<Props> = ({ isOpen, onClose, value, onChange, onFilter, defaultGame }) => {
  const t = useTranslation()
  const { data: levels } = useLevels()

  const [pendingStageId, setPendingStageId] = useState<string | undefined>()
  const [pendingKeyword, setPendingKeyword] = useState<string | undefined>()
  const [lastFilterMeta, setLastFilterMeta] = useState<{ game?: string; catOne?: string }>()

  const selected = useMemo<Level | undefined>(() => {
    if (!value) return undefined
    return levels.find((el) => el.stageId === value)
  }, [levels, value])

  const submit = () => {
    if (pendingStageId) {
      onChange(pendingStageId)
    } else if (pendingKeyword || lastFilterMeta) {
      let kw =
        pendingKeyword ?? [lastFilterMeta?.game, lastFilterMeta?.catOne].filter(Boolean).join(' ').trim()
      const game = (lastFilterMeta?.game || '').trim()
      if (!pendingKeyword && (game === '如鸢' || game === '代号鸢')) {
        kw = [kw, '通用'].filter(Boolean).join(' ')
      }
      if (kw) {
        onFilter?.(kw)
      } else {
        onChange('')
      }
    } else {
      onChange('')
    }
    onClose()
  }

  const resetAll = () => {
    setPendingStageId(undefined)
    setPendingKeyword(undefined)
    setLastFilterMeta(undefined)
    onFilter?.('')
    onChange('')
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t.components.LevelSelect.level}>
      <DialogBody>
        <LevelSelectV2
          // 仅向选择器传递合法的 stageId，避免将筛选关键字当作“自定义关卡”
          value={pendingStageId ?? selected?.stageId}
          // 当没有具体关卡时，优先使用外部传入的默认 game；否则使用上一次筛选条件回显
          defaultGame={defaultGame ?? lastFilterMeta?.game ?? '代号鸢'}
          defaultCategory={lastFilterMeta?.catOne}
          // 上层已是 Dialog，避免再弹 Game 对话框
          useGameDialog={false}
          onChange={(stageId) => {
            setPendingStageId(stageId)
            setPendingKeyword(undefined)
          }}
          onFilterChange={(kw, meta) => {
            if (meta) setLastFilterMeta(meta)
            setPendingKeyword(kw)
            setPendingStageId(undefined)
          }}
        />
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button minimal icon="cross" onClick={onClose}>
              取消
            </Button>
            <Button intent="primary" icon="tick" onClick={submit}>
              搜索
            </Button>
            <Button className="ml-2" onClick={resetAll}>
              重置
            </Button>
          </>
        }
      />
    </Dialog>
  )
}

export default LevelSelectDialog
