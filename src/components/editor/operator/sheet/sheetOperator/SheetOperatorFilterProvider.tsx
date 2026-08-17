import { useAtomValue } from 'jotai'
import { Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useMemo, useState } from 'react'

import { OperatorInfo as ModelsOperator, OPERATORS } from 'models/operator'
import { favOperatorAtom } from 'store/useFavOperators'

import { useSheet } from '../SheetProvider'

type OperatorInfo = ModelsOperator
const operatorInfoByName = new Map(OPERATORS.map((operator) => [operator.name, operator]))

export enum DEFAULTPROFID {
  ALL = 'allProf',
  FAV = 'favProf',
  OTHERS = 'othersProf',
}

export enum DEFAULTSUBPROFID {
  ALL = 'allSubProf',
  SELECTED = 'selectedProf',
}

export interface ProfFilter {
  selectedProf: [string, string]
}
export const defaultProfFilter: ProfFilter = {
  selectedProf: [DEFAULTPROFID.ALL, DEFAULTSUBPROFID.ALL],
}

export interface RarityFilter {
  selectedRarity: number[]
  reverse: boolean
}
export const defaultRarityFilter: RarityFilter = {
  selectedRarity: Array.from(new Array(Math.max(...OPERATORS.map(({ rarity }) => rarity)) + 1).keys()).slice(
    Math.min(...OPERATORS.map(({ rarity }) => rarity)),
  ),
  reverse: false,
}

export interface PaginationFilter {
  size: number
  current: number
}
export const defaultPagination: PaginationFilter = {
  current: 1,
  size: 60,
}

interface OperatorFilterProviderProp {
  children: ReactNode
}

type UseState<T> = [T, Dispatch<SetStateAction<T>>]

type OperatorFilterProviderData = {
  usePaginationFilterState: UseState<PaginationFilter>
  useProfFilterState: UseState<ProfFilter>
  useRarityFilterState: UseState<RarityFilter>
  operatorFiltered: {
    data: OperatorInfo[]
    meta: {
      dataTotal: number
    }
  }
}

const OperatorFilterContext = createContext<OperatorFilterProviderData>({} as OperatorFilterProviderData)

export const OperatorFilterProvider: FC<OperatorFilterProviderProp> = ({ children }) => {
  const [paginationFilter, setPaginationFilter] = useState<PaginationFilter>(defaultPagination)
  const [profFilter, setProfFilter] = useState<ProfFilter>(defaultProfFilter)
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>(defaultRarityFilter)

  return (
    <OperatorFilterContext.Provider
      value={{
        usePaginationFilterState: [paginationFilter, setPaginationFilter],
        useProfFilterState: [profFilter, setProfFilter],
        useRarityFilterState: [rarityFilter, setRarityFilter],
        operatorFiltered: useOperatorFiltered(profFilter, paginationFilter, rarityFilter),
      }}
    >
      {children}
    </OperatorFilterContext.Provider>
  )
}

export const useOperatorFilterProvider = () => useContext(OperatorFilterContext)

const generateCustomizedOperInfo = (name: string): OperatorInfo => ({
  id: 'customized-' + name,
  name,
  prof: 'TOKEN',
  subProf: 'customized',
  name_en: '',
  alias: 'customized-operator',
  rarity: 0,
  alt_name: 'custormized operator named' + name,
})

const useOperatorFiltered = (
  profFilter: ProfFilter,
  paginationFilter: PaginationFilter,
  rarityFilter: RarityFilter,
) => {
  const { allOperators, favOperatorsInfo, selectedOperatorNames } = useOperatorFilterSource()

  const filterResult = useMemo(() => {
    const sourceOperators =
      profFilter.selectedProf[0] === DEFAULTPROFID.FAV ? favOperatorsInfo : allOperators
    const filteredOperators: OperatorInfo[] = []

    for (const operator of sourceOperators) {
      if (
        matchProfFilter(operator, profFilter, selectedOperatorNames) &&
        matchRarityFilter(operator, rarityFilter)
      ) {
        filteredOperators.push(operator)
      }
    }

    filteredOperators.sort(({ rarity: rarityA }, { rarity: rarityB }) =>
      rarityFilter.reverse ? rarityA - rarityB : rarityB - rarityA,
    )

    return filteredOperators
  }, [allOperators, favOperatorsInfo, profFilter, rarityFilter, selectedOperatorNames])

  return {
    // return data after being paginated
    data: filterResult.slice(0, paginationFilter.current * paginationFilter.size),
    meta: {
      dataTotal: filterResult.length,
    },
  }
}

const useOperatorFilterSource = () => {
  const { existedOperators, existedGroups } = useSheet()
  const favOperators = useAtomValue(favOperatorAtom)
  const existedSheetOperators = useMemo(
    () => [...existedOperators, ...existedGroups.flatMap(({ opers }) => opers ?? [])],
    [existedGroups, existedOperators],
  )

  const customizedOperatorsInfo = useMemo<OperatorInfo[]>(
    () => {
      const customizedOperators = new Map<string, OperatorInfo>()

      existedSheetOperators.forEach(({ name }) => {
        if (!operatorInfoByName.has(name)) {
          customizedOperators.set(name, generateCustomizedOperInfo(name))
        }
      })

      return [...customizedOperators.values()]
    },
    [existedSheetOperators],
  )
  const allOperators = useMemo(() => [...OPERATORS, ...customizedOperatorsInfo], [customizedOperatorsInfo])
  const favOperatorsInfo = useMemo<OperatorInfo[]>(
    () =>
      favOperators.map(
        ({ name }) => operatorInfoByName.get(name) || generateCustomizedOperInfo(name),
      ),
    [favOperators],
  )
  const selectedOperatorNames = useMemo(
    () => new Set(existedSheetOperators.map(({ name }) => name)),
    [existedSheetOperators],
  )

  return { allOperators, favOperatorsInfo, selectedOperatorNames }
}

const matchProfFilter = (
  operator: OperatorInfo,
  {
    selectedProf: [prof, subProf],
  }: ProfFilter,
  selectedOperatorNames: Set<string>,
) => {
  const profMatched =
    prof === DEFAULTPROFID.ALL ||
    prof === DEFAULTPROFID.FAV ||
    (prof === DEFAULTPROFID.OTHERS ? operator.prof === 'TOKEN' : operator.prof === prof)

  if (!profMatched) return false

  switch (subProf) {
    case DEFAULTSUBPROFID.ALL:
      return true
    case DEFAULTSUBPROFID.SELECTED:
      return selectedOperatorNames.has(operator.name)
    default:
      return operator.subProf === subProf
  }
}

const matchRarityFilter = ({ rarity }: OperatorInfo, { selectedRarity }: RarityFilter) => {
  return selectedRarity.includes(rarity)
}
