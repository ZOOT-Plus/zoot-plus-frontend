import { Button, Divider, H4, H5 } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { FC, ImgHTMLAttributes, useEffect, useMemo } from 'react'

import { PROFESSIONS } from 'models/operator'

import { languageAtom, useTranslation } from '../../../../../i18n/i18n'
import {
  DEFAULTPROFID,
  DEFAULTSUBPROFID,
  defaultPagination,
  useOperatorFilterProvider,
} from './SheetOperatorFilterProvider'
import { OperatorBackToTop } from './toolBox/OperatorBackToTop'
import { OperatorMutipleSelect } from './toolBox/OperatorMutipleSelect'
import { OperatorRaritySelect } from './toolBox/OperatorRaritySelect'

export interface ProfClassificationWithFiltersProp {
  toTop: () => void
}

export const ProfClassificationWithFilters: FC<
  ProfClassificationWithFiltersProp
> = ({ toTop }) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const {
    useProfFilterState: [{ selectedProf }, setProfFilter],
    usePaginationFilterState: [_, setPaginationFilter],
  } = useOperatorFilterProvider()

  const formattedProfessions = useMemo(
    () => [
      {
        id: DEFAULTPROFID.ALL,
        name: t.components.editor.operator.sheet.sheetOperator
          .ProfClassificationWithFilters.all,
        name_en:
          t.components.editor.operator.sheet.sheetOperator
            .ProfClassificationWithFilters.all,
        sub: [],
      },
      {
        id: DEFAULTPROFID.FAV,
        name: t.components.editor.operator.sheet.sheetOperator
          .ProfClassificationWithFilters.favorites,
        name_en:
          t.components.editor.operator.sheet.sheetOperator
            .ProfClassificationWithFilters.favorites,
        sub: [],
      },
      ...PROFESSIONS.map((profession) => ({
        ...profession,
        name_en: profession.name_en || profession.name,
      })),
      {
        id: DEFAULTPROFID.OTHERS,
        name: t.components.editor.operator.sheet.sheetOperator
          .ProfClassificationWithFilters.others,
        name_en:
          t.components.editor.operator.sheet.sheetOperator
            .ProfClassificationWithFilters.others,
        sub: [],
      },
    ],
    [t],
  )
  const subProfs = useMemo(() => {
    return [
      {
        id: DEFAULTSUBPROFID.ALL,
        name: t.components.editor.operator.sheet.sheetOperator
          .ProfClassificationWithFilters.all,
        name_en:
          t.components.editor.operator.sheet.sheetOperator
            .ProfClassificationWithFilters.all,
      },
      {
        id: DEFAULTSUBPROFID.SELECTED,
        name: t.components.editor.operator.sheet.sheetOperator
          .ProfClassificationWithFilters.selected,
        name_en:
          t.components.editor.operator.sheet.sheetOperator
            .ProfClassificationWithFilters.selected,
      },
      ...(formattedProfessions.find(({ id }) => id === selectedProf[0])?.sub ||
        []),
    ]
  }, [selectedProf, formattedProfessions, t])

  useEffect(() => {
    toTop()
    setPaginationFilter(defaultPagination)
  }, [selectedProf, setPaginationFilter, toTop])

  const ToolBox = (
    <div className="flex flex-col absolute bottom-0">
      <Popover2
        // 过滤器弹层需在遮罩之上
        usePortal={true}
        popoverClassName="z-[1600]"
        portalClassName="z-[1600]"
        content={
          <>
            <OperatorRaritySelect />
          </>
        }
      >
        <Button minimal icon="filter-list" />
      </Popover2>
      <OperatorMutipleSelect />
      <OperatorBackToTop {...{ toTop }} />
    </div>
  )

  return (
    <div className="flex flex-row-reverse relative h-full">
      <ul className="h-full flex flex-col w-6 sm:w-12">
        {formattedProfessions.map((prof) => (
          <ProfIcon
            key={prof.id}
            profId={prof.id}
            name={language === 'zh_tw' && prof.name_en ? prof.name_en : prof.name}
            selected={selectedProf.includes(prof.id)}
            onProfClick={() =>
              setProfFilter((prev) => ({
                ...prev,
                selectedProf: [prof.id, DEFAULTSUBPROFID.ALL],
              }))
            }
          />
        ))}
      </ul>
      <Divider className="mr-0" />
      <div className="h-full flex flex-col justify-center items-end absolute right-full sm:relative sm:left-0">
        <ul>
          {subProfs.map((subProf) => (
            <li key={subProf.id}>
              <H4
                className={clsx(
                  'truncate cursor-pointer my-3 opacity-50 hover:underline hover:opacity-90',
                  selectedProf.includes(subProf.id) && '!opacity-100 underline',
                  (language === 'zh_tw' && subProf.name_en
                    ? subProf.name_en
                    : subProf.name
                  ).length > 3 && '!text-base',
                )}
                onClick={() =>
                  setProfFilter(({ selectedProf, ...rest }) => ({
                    selectedProf: [selectedProf[0], subProf.id],
                    ...rest,
                  }))
                }
              >
                {language === 'zh_tw' && subProf.name_en
                  ? subProf.name_en
                  : subProf.name}
              </H4>
            </li>
          ))}
        </ul>
        {ToolBox}
      </div>
    </div>
  )
}

interface ProfIconProp extends ImgHTMLAttributes<HTMLImageElement> {
  name: string
  profId: string
  selected: boolean
  onProfClick: () => void
}

const ProfIcon: FC<ProfIconProp> = ({
  name,
  profId,
  selected,
  onProfClick,
  ...restImgProps
}) => {
  return (
    <li
      className="grow cursor-pointer relative flex justify-center items-center"
      title={name}
      role="presentation"
      onClick={onProfClick}
    >
      {(Object.values(DEFAULTPROFID) as string[]).includes(profId) ? (
        <H5 className="!text-xs sm:!text-base truncate">{name}</H5>
      ) : (
        <img
          {...restImgProps}
          className="dark:invert-0"
          src={'/assets/prof-icons/' + profId + '.png'}
          alt=""
          title={name}
        />
      )}
      {selected && (
        <div className="h-full w-1 bg-black dark:bg-white absolute top-0 right-full rounded" />
      )}
    </li>
  )
}
