import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  H6,
  Tag,
} from '@blueprintjs/core'

import clsx from 'clsx'
import { getDefaultStore, useAtom, useAtomValue } from 'jotai'
import { compact } from 'lodash-es'
import { FC, useEffect, useMemo, useState } from 'react'

import { languageAtom, useTranslation } from '../i18n/i18n'
import { OPERATORS } from '../models/operator'
import {
  DEFAULT_OPERATOR_FILTER,
  OperatorFilterData,
  operatorFilterAtom,
} from '../store/selectedOperators'
import { OperatorAvatar } from './OperatorAvatar'
import { OperatorSelect } from './OperatorSelect'

export function useOperatorFilter() {
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilterData>(
    () => {
      // 用本地保存的干员过滤器来初始化
      const savedOperatorFilter = getDefaultStore().get(operatorFilterAtom)
      if (savedOperatorFilter.save) {
        return savedOperatorFilter
      }
      return { ...DEFAULT_OPERATOR_FILTER, save: false }
    },
  )

  return {
    operatorFilter,
    setOperatorFilter,
  }
}

interface OperatorFilterProps {
  className?: string
  filter: OperatorFilterData
  onChange: (filter: OperatorFilterData) => void
}

export const OperatorFilter: FC<OperatorFilterProps> = ({
  className,
  filter,
  onChange,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const [savedFilter, setSavedFilter] = useAtom(operatorFilterAtom)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<typeof savedFilter>(filter)

  useEffect(() => {
    // 对话框关闭时还原
    if (!dialogOpen) {
      setEditingFilter(filter)
    }
  }, [dialogOpen, filter])

  const { includedOperators, excludedOperators } = useMemo(
    () => ({
      includedOperators: compact(
        filter.included.map((name) =>
          OPERATORS.find((operator) => operator.name === name),
        ),
      ),
      excludedOperators: compact(
        filter.excluded.map((name) =>
          OPERATORS.find((operator) => operator.name === name),
        ),
      ),
    }),
    [filter],
  )

  const updateEditingFilter = (included?: string[], excluded?: string[]) => {
    // 当两个数组中的干员冲突时，保留最新的
    if (included && !excluded) {
      excluded = editingFilter.excluded.filter(
        (name) => !included!.includes(name),
      )
    } else if (!included && excluded) {
      included = editingFilter.included.filter(
        (name) => !excluded!.includes(name),
      )
    } else {
      included = editingFilter.included
      excluded = editingFilter.excluded
    }
    setEditingFilter({
      ...editingFilter,
      included,
      excluded,
    })
  }

  const submit = () => {
    onChange(editingFilter)

    if (editingFilter.save) {
      setSavedFilter(editingFilter)
    } else if (savedFilter.save) {
      setSavedFilter({
        ...savedFilter,
        save: false,
      })
    }
  }

  const handleSave = (save: boolean) => {
    setEditingFilter({ ...editingFilter, save })
  }

  const handleEnable = (enabled: boolean) => {
    onChange({ ...filter, enabled })
    setEditingFilter({ ...editingFilter, enabled })
    if (savedFilter.save) {
      setSavedFilter({ ...savedFilter, enabled })
    }
  }

  return (
    <div className={clsx('flex items-center', className)}>
      {includedOperators.length > 0 || excludedOperators.length > 0 ? (
        <>
          <Button minimal onClick={() => setDialogOpen(true)} className="!p-1">
            <div
              className={clsx(
                'flex flex-wrap gap-1',
                !filter.enabled && 'opacity-30',
              )}
            >
              {includedOperators.map(({ id, name, name_en, rarity }) => (
                <Tag minimal key={id} className="py-0 pl-0" intent="primary">
                  <div className="flex items-center gap-1 text-sm">
                    <OperatorAvatar
                      className="w-8 h-8"
                      id={id}
                      rarity={rarity}
                    />
                    &nbsp;{language === 'zh_tw' ? name_en : name}
                    &nbsp;
                  </div>
                </Tag>
              ))}
              {excludedOperators.map(({ id, name, name_en, rarity }) => (
                <Tag minimal key={id} className="py-0 pl-0" intent="danger">
                  <div className="flex items-center gap-1 text-sm line-through">
                    <OperatorAvatar
                      className="w-8 h-8"
                      id={id}
                      rarity={rarity}
                    />
                    &nbsp;{language === 'zh_tw' ? name_en : name}
                    &nbsp; {/* 两边加空格让删除线更显眼一些 */}
                  </div>
                </Tag>
              ))}
            </div>
          </Button>
          <Button
            minimal
            icon="power"
            title={t.components.OperatorFilter.disable_operator_selection}
            active={!editingFilter.enabled}
            onClick={() => handleEnable(!editingFilter.enabled)}
          />
        </>
      ) : (
        <Button
          minimal
          className="!px-3"
          icon="plus"
          onClick={() => setDialogOpen(true)}
        >
          {t.components.OperatorFilter.operators}
        </Button>
      )}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t.components.OperatorFilter.select_operators}
      >
        <DialogBody>
          <H6 className="mb-4">
            {t.components.OperatorFilter.included_operators}
          </H6>
          <OperatorSelect
            operators={editingFilter.included}
            onChange={(included) => updateEditingFilter(included, undefined)}
          />
          <H6 className="mt-6 mb-4">
            {t.components.OperatorFilter.excluded_operators}
          </H6>
          <OperatorSelect
            operators={editingFilter.excluded}
            onChange={(excluded) => updateEditingFilter(undefined, excluded)}
          />
          <p className="mt-2 opacity-75">
            {t.components.OperatorFilter.search_help}
          </p>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button minimal icon="cross" onClick={() => setDialogOpen(false)}>
                {t.components.OperatorFilter.cancel}
              </Button>
              <Button
                intent="primary"
                icon="tick"
                onClick={() => {
                  submit()
                  setDialogOpen(false)
                }}
              >
                {t.components.OperatorFilter.confirm}
              </Button>
            </>
          }
        >
          <Checkbox
            className="inline-block mb-0"
            checked={editingFilter.save}
            onChange={(e) => handleSave(e.currentTarget.checked)}
          >
            {t.components.OperatorFilter.remember_selection}
          </Checkbox>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
