import Fuse from 'fuse.js'
import { useAtomValue } from 'jotai'
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
  const { allOperators, favOperatorsInfo, selectedOperatorNames } = useOperatorFilterSource()

  const filterResult = useMemo(() => {
    const sourceOperators =
      profFilter.selectedProf[0] === DEFAULTPROFID.FAV ? favOperatorsInfo : allOperators
    // do fuse search first, then filter by prof and rarity
    const fuseFilteredOperators = fuseFilterHandle(createFuseFilterPayload({ nameFilter }), sourceOperators)
    const filteredOperators: OperatorInfo[] = []

    for (const operator of fuseFilteredOperators) {
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
  }, [allOperators, favOperatorsInfo, nameFilter, profFilter, rarityFilter, selectedOperatorNames])

  return {
    // return data after being paginated
    data: filterResult.slice(0, paginationFilter.current * paginationFilter.size),
    meta: {
      dataTotal: filterResult.length,
    },
  }
}

const useOperatorFilterSource = () => {
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
  const allOperators = useMemo(() => [...OPERATORS, ...customizedOperatorsInfo], [customizedOperatorsInfo])
  const favOperatorsInfo = useMemo<OperatorInfo[]>(
    () =>
      favOperators.map(
        ({ name }) => OPERATORS.find(({ name: OPERName }) => OPERName === name) || generateCustomizedOperInfo(name),
      ),
    [favOperators],
  )
  const selectedOperatorNames = useMemo(
    () => new Set(existedOperators.map(({ name }) => name)),
    [existedOperators],
  )

  return { allOperators, favOperatorsInfo, selectedOperatorNames }
}

interface FuseFilterPayload {
  query: string
  keys: string[]
}

const createFuseFilterPayload = ({ nameFilter }: { nameFilter: NameFilter }): FuseFilterPayload | undefined => {
  const query = nameFilter.query.trim()
  if (!query) return undefined

  return {
    query,
    keys: ['name', 'name_en', 'alias', 'alt_name'],
  }
}

const fuseFilterHandle = (
  payload: FuseFilterPayload | undefined,
  originData: OperatorInfo[] = OPERATORS,
) => {
  if (!payload) return originData

  return new Fuse(originData, {
    keys: payload.keys,
    threshold: 0.3,
  })
    .search(payload.query)
    .map((el) => el.item)
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
