import { Button, Dialog, DialogBody, DialogFooter, InputGroup, MenuItem } from '@blueprintjs/core'
import { Classes } from '@blueprintjs/core'
import clsx from 'clsx'
import { FC, useMemo, useState } from 'react'

interface GameSelectDialogProps {
  isOpen: boolean
  onClose: () => void
  items: string[]
  value?: string | null
  onSelect: (game: string) => void
  title?: string
}

export const GameSelectDialog: FC<GameSelectDialogProps> = ({
  isOpen,
  onClose,
  items,
  value,
  onSelect,
  title = '选择游戏',
}) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.toLowerCase().includes(q))
  }, [items, query])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} canOutsideClickClose canEscapeKeyClose>
      <DialogBody>
        <InputGroup
          large
          leftIcon="search"
          placeholder="搜索游戏名称"
          value={query}
          onChange={(e: any) => setQuery(e.currentTarget.value)}
          className="mb-3"
        />
        <ul className={clsx(Classes.MENU, 'max-h-[50vh] overflow-auto')}> 
          {filtered.map((game) => (
            <MenuItem
              roleStructure="listoption"
              key={game}
              className={clsx(value === game && Classes.ACTIVE)}
              text={game}
              onClick={() => {
                onSelect(game)
                onClose()
              }}
            />
          ))}
          {filtered.length === 0 && (
            <li className={clsx(Classes.MENU_ITEM, 'opacity-60')}>无匹配结果</li>
          )}
        </ul>
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button minimal icon="cross" onClick={onClose}>
              取消
            </Button>
          </>
        }
      />
    </Dialog>
  )
}

export default GameSelectDialog

