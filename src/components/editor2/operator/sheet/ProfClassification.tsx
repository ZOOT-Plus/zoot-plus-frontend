import { Divider, H4, H5, Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { languageAtom, useTranslation } from 'i18n/i18n'
import { useAtomValue } from 'jotai'
import {
  FC,
  HTMLAttributes,
  ImgHTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  DEFAULTPROFID,
  DEFAULTSUBPROFID,
  useOperatorFilterProvider,
} from 'components/editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'
import { PROFESSIONS } from 'models/operator'

export interface ProfClassification {}

export const ProfClassification: FC<ProfClassification> = () => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const {
    useProfFilterState: [{ selectedProf }, setProfFilter],
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

  return (
    <div>
      <UlWithArrow className="px-3 py-1 gap-3" key={selectedProf[0]}>
        {subProfs.map((subProf) => (
          <li key={subProf.id} className="flex items-center justify-center">
            <H4
              className={clsx(
                'truncate cursor-pointer opacity-60 hover:underline hover:opacity-90 m-0 !text-xs sm:!text-sm',
                selectedProf.includes(subProf.id) && '!opacity-100 underline',
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
      </UlWithArrow>
      <Divider className="m-0" />
      <UlWithArrow className="px-3 py-1.5 gap-2">
        {formattedProfessions.map((prof) => (
          <ProfIcon
            key={prof.id}
            profId={prof.id}
            name={
              language === 'zh_tw' && prof.name_en ? prof.name_en : prof.name
            }
            selected={selectedProf.includes(prof.id)}
            onProfClick={() =>
              setProfFilter((prev) => ({
                ...prev,
                selectedProf: [prof.id, DEFAULTSUBPROFID.ALL],
              }))
            }
          />
        ))}
      </UlWithArrow>
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
      className="grow cursor-pointer relative flex flex-col items-center justify-center gap-1 py-1 px-2 min-w-[56px]"
      title={name}
      role="presentation"
      onClick={onProfClick}
    >
      {selected && (
        <div className="w-full h-0.5 bg-black dark:bg-white absolute bottom-full left-0 rounded" />
      )}
      {(Object.values(DEFAULTPROFID) as string[]).includes(profId) ? (
        <H5 className="!text-xs sm:!text-sm truncate m-0">{name}</H5>
      ) : (
        <img
          {...restImgProps}
          className={clsx('w-8 h-6 object-contain dark:invert-0', restImgProps.className)}
          src={'/assets/prof-icons/' + profId + '.png'}
          alt=""
          title={name}
        />
      )}
    </li>
  )
}

interface UlWithArrowProp extends HTMLAttributes<HTMLUListElement> {}

const UlWithArrow: FC<UlWithArrowProp> = ({ className, ...ulProps }) => {
  const containerRef = useRef<HTMLUListElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const isOverflow = useMemo(() => showLeft || showRight, [showLeft, showRight])

  useEffect(() => {
    const checkScroll = () => {
      const el = containerRef.current
      if (!el) return
      const { scrollLeft, scrollWidth, clientWidth } = el

      setShowLeft(scrollLeft > 0)
      setShowRight(scrollLeft + clientWidth < scrollWidth - 1)
    }

    const el = containerRef.current
    if (!el) return

    checkScroll()
    el.addEventListener('scroll', checkScroll)

    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(el)
    resizeObserver.observe(el.firstElementChild as Element)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="flex items-center relative w-full">
      {showLeft && (
        <Icon
          icon="chevron-left"
          className="absolute left-0 top-1/2 -translate-y-1/2 invert z-10"
        />
      )}
      <ul
        {...ulProps}
        ref={containerRef}
        className={clsx(
          'flex overflow-auto items-center w-full',
          !isOverflow && 'justify-center',
          className,
        )}
      />
      {showRight && (
        <Icon
          icon="chevron-right"
          className="absolute right-0 top-1/2 -translate-y-1/2 invert z-10"
        />
      )}
    </div>
  )
}
