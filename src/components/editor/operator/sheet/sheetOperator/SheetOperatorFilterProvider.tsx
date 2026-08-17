import { useAtomValue } from 'jotai'
import Fuse from 'fuse.js'
import { Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useMemo, useState } from 'react'

import { OperatorInfo as ModelsOperator, OPERATORS } from 'models/operator'
import { favOperatorAtom } from 'store/useFavOperators'

import { useSheet } from '../SheetProvider'

type OperatorInfo = ModelsOperator

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

export interface NameFilter {
  query: string
}
export const defaultNameFilter: NameFilter = {
  query: '',
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
  useNameFilterState: UseState<NameFilter>
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
  const [nameFilter, setNameFilter] = useState<NameFilter>(defaultNameFilter)

  return (
    <OperatorFilterContext.Provider
      value={{
        usePaginationFilterState: [paginationFilter, setPaginationFilter],
        useProfFilterState: [profFilter, setProfFilter],
        useRarityFilterState: [rarityFilter, setRarityFilter],
        useNameFilterState: [nameFilter, setNameFilter],
        operatorFiltered: useOperatorFiltered(profFilter, paginationFilter, rarityFilter, nameFilter),
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
  nameFilter: NameFilter,
) => {
  // Priority: prof > sub prof > rarity/rarityReverse
  // filterResult init and prof filter about
  const profFilterResult = useProfFilterHandle(profFilter)
  //   rarity about
  const rarityFilterResult = rarityFilterHandle(rarityFilter, profFilterResult)
  //   name search about
  const nameFilterResult = nameFilterHandle(nameFilter, rarityFilterResult)
  //   pagination about
  //   filterResult
  const filterResult = paginationFilterHandle(paginationFilter, nameFilterResult)

  return {
    // return data after being paginated
    data: filterResult,
    meta: {
      dataTotal: nameFilterResult.length,
    },
  }
}

const useProfFilterHandle = (
  profFilter: ProfFilter = {
    selectedProf: [DEFAULTPROFID.ALL, DEFAULTSUBPROFID.ALL],
  },
) => {
  const {
    selectedProf: [prof, subProf],
  } = profFilter
  const { existedOperators } = useSheet()

  const favOperators = useAtomValue(favOperatorAtom)
  const customizedOperatorsInfo = useMemo<OperatorInfo[]>(
    () =>
      existedOperators
        .map(({ name }) =>
          OPERATORS.find(({ name: OPERName }) => OPERName === name) ? undefined : generateCustomizedOperInfo(name),
        )
        .filter((item) => !!item) as OperatorInfo[],
    [existedOperators],
  )
  const favOperatorsInfo = useMemo<OperatorInfo[]>(
    () =>
      favOperators.map(
        ({ name }) => OPERATORS.find(({ name: OPERName }) => OPERName === name) || generateCustomizedOperInfo(name),
      ),
    [favOperators],
  )

  let operatorsFilteredByProf: OperatorInfo[] = []
  const OPERATORSWITHINCUSTOMIZED = [...OPERATORS, ...customizedOperatorsInfo]
  switch (prof) {
    case DEFAULTPROFID.ALL: {
      operatorsFilteredByProf = OPERATORSWITHINCUSTOMIZED
      break
    }
    case DEFAULTPROFID.FAV: {
      operatorsFilteredByProf = favOperatorsInfo
      break
    }
    case DEFAULTPROFID.OTHERS: {
      operatorsFilteredByProf = OPERATORSWITHINCUSTOMIZED.filter(({ prof }) => prof === 'TOKEN')
      break
    }

    default: {
      operatorsFilteredByProf = OPERATORSWITHINCUSTOMIZED.filter(({ prof: OPERProf }) => OPERProf === prof)
      break
    }
  }

  switch (subProf) {
    case DEFAULTSUBPROFID.ALL: {
      return operatorsFilteredByProf
    }
    case DEFAULTSUBPROFID.SELECTED: {
      return operatorsFilteredByProf.filter(
        ({ name }) => !!existedOperators.find(({ name: existedName }) => existedName === name),
      )
    }
    default: {
      return operatorsFilteredByProf.filter(({ subProf: operatorSubProf }) => operatorSubProf === subProf)
    }
  }
}

const paginationFilterHandle = ({ current, size }: PaginationFilter, originData: OperatorInfo[] = OPERATORS) =>
  originData.slice(0, current * size)

const rarityFilterHandle = ({ selectedRarity, reverse }: RarityFilter, originData: OperatorInfo[] = OPERATORS) =>
  originData
    .filter(({ rarity }) => selectedRarity.includes(rarity))
    .sort(({ rarity: rarityA }, { rarity: rarityB }) => (reverse ? rarityA - rarityB : rarityB - rarityA))

const nameFilterHandle = ({ query }: NameFilter, originData: OperatorInfo[] = OPERATORS) => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return originData

  return new Fuse(originData, {
    keys: ['name', 'name_en', 'alias', 'alt_name'],
    threshold: 0.3,
  })
    .search(trimmedQuery)
    .map((el) => el.item)
}
