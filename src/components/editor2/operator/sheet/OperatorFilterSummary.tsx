import { Tag } from '@blueprintjs/core'

import { useAtomValue } from 'jotai'

import { languageAtom, useTranslation } from '../../../../i18n/i18n'
import { PROFESSIONS } from '../../../../models/operator'
import {
  DEFAULTPROFID,
  DEFAULTSUBPROFID,
  defaultNameFilter,
  defaultPagination,
  defaultProfFilter,
  defaultRarityFilter,
  useOperatorFilterProvider,
} from '../../../editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'

export const OperatorFilterSummary = () => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const {
    useProfFilterState: [{ selectedProf }, setProfFilter],
    useNameFilterState: [{ query }, setNameFilter],
    useRarityFilterState: [{ selectedRarity, reverse }, setRarityFilter],
    usePaginationFilterState: [_, setPaginationFilter],
  } = useOperatorFilterProvider()

  const resetPagination = () => {
    setPaginationFilter(defaultPagination)
  }

  const getProfName = (profId: string) => {
    switch (profId) {
      case DEFAULTPROFID.ALL:
        return undefined
      case DEFAULTPROFID.FAV:
        return t.components.editor.operator.sheet.sheetOperator.ProfClassificationWithFilters.favorites
      case DEFAULTPROFID.OTHERS:
        return t.components.editor.operator.sheet.sheetOperator.ProfClassificationWithFilters.others
      default: {
        const profession = PROFESSIONS.find(({ id }) => id === profId)
        return profession ? (language === 'en' && profession.name_en ? profession.name_en : profession.name) : profId
      }
    }
  }

  const getSubProfName = (profId: string, subProfId: string) => {
    switch (subProfId) {
      case DEFAULTSUBPROFID.ALL:
        return undefined
      case DEFAULTSUBPROFID.SELECTED:
        return t.components.editor.operator.sheet.sheetOperator.ProfClassificationWithFilters.selected
      default: {
        const subProf = PROFESSIONS.find(({ id }) => id === profId)?.sub.find(({ id }) => id === subProfId)
        return subProf ? (language === 'en' && subProf.name_en ? subProf.name_en : subProf.name) : subProfId
      }
    }
  }

  const rarityChanged =
    reverse !== defaultRarityFilter.reverse ||
    selectedRarity.length !== defaultRarityFilter.selectedRarity.length ||
    selectedRarity.some((rarity) => !defaultRarityFilter.selectedRarity.includes(rarity))
  const profName = getProfName(selectedProf[0])
  const subProfName = getSubProfName(selectedProf[0], selectedProf[1])

  const filters = [
    query.trim()
      ? {
          key: 'search',
          label: t.components.editor2.OperatorFilterSummary.search({
            query: query.trim(),
          }),
          onRemove: () => {
            setNameFilter(defaultNameFilter)
            resetPagination()
          },
        }
      : undefined,
    profName
      ? {
          key: 'profession',
          label: t.components.editor2.OperatorFilterSummary.profession({
            name: profName,
          }),
          onRemove: () => {
            setProfFilter(defaultProfFilter)
            resetPagination()
          },
        }
      : undefined,
    subProfName
      ? {
          key: 'sub-profession',
          label: t.components.editor2.OperatorFilterSummary.sub_profession({
            name: subProfName,
          }),
          onRemove: () => {
            setProfFilter(({ selectedProf, ...rest }) => ({
              ...rest,
              selectedProf: [selectedProf[0], DEFAULTSUBPROFID.ALL],
            }))
            resetPagination()
          },
        }
      : undefined,
    rarityChanged
      ? {
          key: 'rarity',
          label: t.components.editor2.OperatorFilterSummary.rarity({
            rarities: [...selectedRarity].sort((a, b) => a - b).join(', '),
            order: reverse
              ? t.components.editor2.OperatorFilterSummary.ascending
              : t.components.editor2.OperatorFilterSummary.descending,
          }),
          onRemove: () => {
            setRarityFilter(defaultRarityFilter)
            resetPagination()
          },
        }
      : undefined,
  ].filter((item): item is { key: string; label: string; onRemove: () => void } => !!item)

  if (!filters.length) {
    return null
  }

  return (
    <div className="operator-filter-summary sticky -top-4 z-20 mb-2 flex min-h-8 flex-wrap items-center justify-end gap-1 border-y border-gray-200 bg-zinc-50 py-4 dark:border-gray-700 dark:bg-[#2f343c]">
      <span className="text-xs font-semibold text-gray-500">
        {t.components.editor2.OperatorFilterSummary.current}
      </span>
      {filters.map(({ key, label, onRemove }) => (
        <Tag key={key} className="dark:!bg-slate-700 dark:!text-slate-100" minimal onRemove={onRemove}>
          {label}
        </Tag>
      ))}
    </div>
  )
}
