import {
  Callout,
  FormGroup,
  InputGroup,
  Radio,
  RadioGroup,
  Tag,
  TextArea,
} from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Paths } from 'type-fest'

import { i18n, useTranslation } from '../../i18n/i18n'
import { Level, OpDifficulty, Operation } from '../../models/operation'
import { OperatorAvatar } from '../OperatorAvatar'
import { NumericInput2 } from '../editor/NumericInput2'
import { LevelSelect } from './LevelSelect'
import { editorAtoms, useEdit } from './editor-state'
import { OperatorSidebarInInfo } from './operator/OperatorSidebarInInfo'
import { DEFAULT_SIMING_ACTION_DELAYS } from './siming/constants'
import { CopilotOperation, getLabeledPath } from './validation/schema'

interface InfoEditorProps {
  className?: string
  preLevel?: Operation['preLevel']
}

export const InfoEditor = memo(({ className, preLevel }: InfoEditorProps) => {
  const [info, setInfo] = useImmerAtom(editorAtoms.operationBase)
  const [metadata, setMetadata] = useImmerAtom(editorAtoms.metadata)
  const edit = useEdit()
  const t = useTranslation()
  const selectedOperators = useAtomValue(editorAtoms.operators)

  useEffect(() => {
    if (info.difficulty === undefined) {
      setInfo((prev) => {
        prev.difficulty = OpDifficulty.UNKNOWN
      })
    }
  }, [info.difficulty, setInfo])

  const simingDelays = info.simingActionDelays ?? DEFAULT_SIMING_ACTION_DELAYS

  // 司命延迟快捷预设
  const presetFast = { attack: 2000, ultimate: 4000, defense: 2000 } as const
  const presetNormal = { attack: 3000, ultimate: 5000, defense: 3000 } as const
  const presetSlow = { attack: 6000, ultimate: 10000, defense: 6000 } as const

  const isPresetEqual = (
    a: { attack: number; ultimate: number; defense: number },
    b: { attack: number; ultimate: number; defense: number },
  ) =>
    a.attack === b.attack &&
    a.ultimate === b.ultimate &&
    a.defense === b.defense

  const currentIsFast = isPresetEqual(simingDelays, presetFast)
  const currentIsNormal = isPresetEqual(simingDelays, presetNormal)
  const currentIsSlow = isPresetEqual(simingDelays, presetSlow)

  const applyPreset = (
    preset: 'fast' | 'normal' | 'slow',
    values: typeof presetFast | typeof presetNormal | typeof presetSlow,
  ) => {
    edit(() => {
      setInfo((prev) => {
        prev.simingActionDelays = { ...values }
      })
      return {
        action: 'set-siming-preset',
        desc: i18n.actions.editor2.set_siming_preset,
        squashBy: 'siming-preset-' + preset,
      }
    })
  }

  const fallbackLevel = useMemo<Level | undefined>(() => {
    if (preLevel) {
      return preLevel
    }
    const meta = info.levelMeta
    if (!meta) return undefined
    return {
      stageId: meta.stageId ?? '',
      levelId: meta.levelId ?? '',
      name: meta.name ?? '',
      game: meta.game ?? '',
      catOne: meta.catOne ?? '',
      catTwo: meta.catTwo ?? '',
      catThree: meta.catThree ?? '',
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    }
  }, [info.levelMeta, preLevel])

  const normalizedGame = fallbackLevel?.game?.trim() ?? ''
  const defaultGame = normalizedGame.length > 0 ? normalizedGame : '代号鸢'
  const defaultCategory =
    fallbackLevel?.catOne?.trim() ||
    fallbackLevel?.catTwo?.trim() ||
    fallbackLevel?.catThree?.trim() ||
    undefined

  const updateSimingDelay = (
    key: keyof typeof DEFAULT_SIMING_ACTION_DELAYS,
    nextValue: number,
  ) => {
    const normalized = Math.max(0, Math.round(nextValue))
    if (simingDelays[key] === normalized) {
      return
    }
    edit(() => {
      setInfo((prev) => {
        if (!prev.simingActionDelays) {
          prev.simingActionDelays = { ...DEFAULT_SIMING_ACTION_DELAYS }
        }
        prev.simingActionDelays[key] = normalized
      })
      return {
        action: 'set-siming-delay',
        desc: i18n.actions.editor2.set_siming_delay,
        squashBy: 'siming-delay-' + key,
      }
    })
  }

  const assignLevelMeta = useCallback(
    (level: Level | undefined, fallbackStageId?: string) => {
      if (!level) {
        return fallbackStageId
          ? {
              stageId: fallbackStageId,
              catTwo: fallbackStageId,
            }
          : undefined
      }
      return {
        stageId: level.stageId || fallbackStageId,
        levelId: level.levelId,
        name: level.name,
        game: level.game,
        catOne: level.catOne,
        catTwo: level.catTwo,
        catThree: level.catThree,
        width: level.width,
        height: level.height,
      }
    },
    [],
  )

  useEffect(() => {
    if (!preLevel) {
      return
    }
    const nextMeta = assignLevelMeta(preLevel)
    if (!nextMeta?.stageId) {
      return
    }
    setInfo((prev) => {
      if (prev.levelMeta?.stageId) {
        return
      }
      prev.levelMeta = nextMeta
      if (!prev.stageName) {
        prev.stageName = nextMeta.stageId ?? ''
      }
    })
  }, [assignLevelMeta, preLevel, setInfo])

  useEffect(() => {
    if (info.stageName?.trim()) {
      return
    }
    if (!fallbackLevel?.stageId?.trim()) {
      return
    }
    edit(() => {
      setInfo((prev) => {
        if (!prev.stageName?.trim()) {
          prev.stageName = fallbackLevel.stageId
        }
        if (!prev.levelMeta?.stageId) {
          prev.levelMeta = assignLevelMeta(fallbackLevel, fallbackLevel.stageId)
        }
      })
      return {
        action: 'hydrate-level-from-meta',
        desc: i18n.actions.editor2.set_level,
      }
    })
  }, [assignLevelMeta, edit, fallbackLevel, info.stageName, setInfo])

  return (
    <div
      className={clsx(
        'p-4 md:[&>.bp4-form-group]:flex-row md:[&>.bp4-form-group>.bp4-label]:w-20',
        '[&_[type="text"]]:!border-0 [&_textarea]:!outline-none [&_[type="text"]]:shadow-[inset_0_0_2px_0_rgba(0,0,0,0.4)] [&_textarea:not(:focus)]:!shadow-[inset_0_0_2px_0_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <h3 className="mb-2 text-lg font-bold">
        {t.components.editor2.InfoEditor.job_info}
      </h3>

      <FormGroup
        contentClassName="grow"
        label={t.components.editor2.InfoEditor.stage}
        labelInfo="*"
      >
        <LevelSelect
          difficulty={info.difficulty ?? OpDifficulty.UNKNOWN}
          value={info.stageName}
          fallbackLevel={fallbackLevel}
          defaultGame={defaultGame}
          defaultCategory={defaultCategory}
          onChange={(stageId, level) => {
            edit(() => {
              setInfo((prev) => {
                prev.stageName = stageId

                if (level && !prev.doc.title) {
                  // 如果没有标题，则使用关卡名作为标题
                  const normalizedName = level.name?.trim()
                  prev.doc.title = normalizedName?.length
                    ? normalizedName
                    : level.stageId
                }
                prev.levelMeta = assignLevelMeta(level, stageId)
                if (!level) {
                  prev.levelMeta = prev.levelMeta?.stageId
                    ? prev.levelMeta
                    : undefined
                }
              })
              return {
                action: 'update-level',
                desc: i18n.actions.editor2.set_level,
              }
            })
          }}
          onDifficultyChange={(val) => {
            edit(() => {
              setInfo((prev) => {
                prev.difficulty = val
              })
              return {
                action: 'set-difficulty',
                desc: i18n.actions.editor2.set_difficulty,
                squashBy: '',
              }
            })
          }}
        />
        <FieldError path="stage_name" />
      </FormGroup>
      <FormGroup
        contentClassName="grow"
        label={t.components.editor2.SelectorPanel.operator}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {selectedOperators.length === 0 ? (
              <Tag minimal>
                {t.components.editor2.OperatorEditor.no_operators}
              </Tag>
            ) : (
              selectedOperators.map((op) => (
                <OperatorAvatar
                  key={op.id}
                  name={op.name}
                  size="verylarge" /* 48px */
                  sourceSize={96}
                />
              ))
            )}
          </div>
          <OperatorSidebarInInfo />
        </div>
      </FormGroup>
      {/* 隐藏适用难度选择，保留字段以兼容旧数据 */}
      <input
        type="hidden"
        name="difficulty"
        value={info.difficulty ?? OpDifficulty.UNKNOWN}
        readOnly
      />
      <FormGroup
        contentClassName="grow"
        label={t.components.editor2.InfoEditor.title}
        labelInfo="*"
      >
        <InputGroup
          large
          fill
          placeholder={t.components.editor2.InfoEditor.title_placeholder}
          value={info.doc?.title || ''}
          onChange={(e) => {
            edit(() => {
              setInfo((prev) => {
                prev.doc.title = e.target.value
              })
              return {
                action: 'update-title',
                desc: i18n.actions.editor2.set_title,
                squashBy: '',
              }
            })
          }}
          onBlur={() => edit()}
        />
        <FieldError path="doc.title" />
      </FormGroup>
      <FormGroup
        contentClassName="grow"
        label={t.components.editor2.InfoEditor.description}
      >
        <TextArea
          fill
          rows={4}
          large
          placeholder={t.components.editor2.InfoEditor.description_placeholder}
          value={info.doc?.details || ''}
          onChange={(e) => {
            edit(() => {
              setInfo((prev) => {
                prev.doc.details = e.target.value
              })
              return {
                action: 'update-details',
                desc: i18n.actions.editor2.set_description,
                squashBy: '',
              }
            })
          }}
          onBlur={() => edit()}
        />
        <FieldError path="doc.details" />
      </FormGroup>
      <FormGroup
        contentClassName="grow"
        label={t.components.editor2.InfoEditor.siming_settings}
        helperText={t.components.editor2.InfoEditor.siming_delay_hint}
      >
        {/* 预设选项：极速 / 普通 / 超慢 */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {t.components.editor2.InfoEditor.siming_preset_label}
          </span>
          <Tag
            interactive
            minimal={!currentIsFast}
            intent={currentIsFast ? 'primary' : 'none'}
            onClick={() => applyPreset('fast', presetFast)}
          >
            {t.components.editor2.InfoEditor.siming_preset_fast}
            <span className="ml-1 opacity-70">(2000/4000/2000)</span>
          </Tag>
          <Tag
            interactive
            minimal={!currentIsNormal}
            intent={currentIsNormal ? 'primary' : 'none'}
            onClick={() => applyPreset('normal', presetNormal)}
          >
            {t.components.editor2.InfoEditor.siming_preset_normal}
            <span className="ml-1 opacity-70">(3000/5000/3000)</span>
          </Tag>
          <Tag
            interactive
            minimal={!currentIsSlow}
            intent={currentIsSlow ? 'primary' : 'none'}
            onClick={() => applyPreset('slow', presetSlow)}
          >
            {t.components.editor2.InfoEditor.siming_preset_slow}
            <span className="ml-1 opacity-70">(6000/10000/6000)</span>
          </Tag>
          {!(currentIsFast || currentIsNormal || currentIsSlow) && (
            <Tag minimal className="ml-1" intent="none">
              {t.components.editor2.InfoEditor.siming_preset_custom}
            </Tag>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            <span className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t.components.editor2.InfoEditor.siming_delay_attack}
            </span>
            <NumericInput2
              min={1000}
              max={60000}
              intOnly
              stepSize={100}
              majorStepSize={1000}
              wheelStepSize={100}
              value={simingDelays.attack}
              aria-label={t.components.editor2.InfoEditor.siming_delay_attack}
              containerClassName="editor-loop-range-input w-28"
              onValueChange={(value) => updateSimingDelay('attack', value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            <span className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t.components.editor2.InfoEditor.siming_delay_ultimate}
            </span>
            <NumericInput2
              min={3000}
              max={60000}
              intOnly
              stepSize={100}
              majorStepSize={1000}
              wheelStepSize={100}
              value={simingDelays.ultimate}
              aria-label={t.components.editor2.InfoEditor.siming_delay_ultimate}
              containerClassName="editor-loop-range-input w-28"
              onValueChange={(value) => updateSimingDelay('ultimate', value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            <span className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t.components.editor2.InfoEditor.siming_delay_defense}
            </span>
            <NumericInput2
              min={1000}
              max={60000}
              intOnly
              stepSize={100}
              majorStepSize={1000}
              wheelStepSize={100}
              value={simingDelays.defense}
              aria-label={t.components.editor2.InfoEditor.siming_delay_defense}
              containerClassName="editor-loop-range-input w-28"
              onValueChange={(value) => updateSimingDelay('defense', value)}
            />
          </div>
        </div>
      </FormGroup>
      <FormGroup
        className="mb-0"
        contentClassName="grow"
        label={t.components.editor2.InfoEditor.visibility}
      >
        <RadioGroup
          inline
          selectedValue={metadata.visibility}
          onChange={(e) => {
            edit(() => {
              setMetadata((prev) => {
                prev.visibility = e.currentTarget.value as 'public' | 'private'
              })
              return {
                action: 'update-visibility',
                desc: i18n.actions.editor2.set_visibility,
                squashBy: '',
              }
            })
          }}
        >
          <Radio className="!mt-0" value="public">
            {t.components.editor2.InfoEditor.public}
          </Radio>
          <Radio className="!mt-0" value="private">
            {t.components.editor2.InfoEditor.private}
            <span className="ml-2 text-xs opacity-50">
              {t.components.editor2.InfoEditor.private_note}
            </span>
          </Radio>
        </RadioGroup>
      </FormGroup>
    </div>
  )
})
InfoEditor.displayName = 'InfoEditor'

const FieldError = ({ path }: { path: Paths<CopilotOperation> }) => {
  const globalErrors = useAtomValue(editorAtoms.visibleGlobalErrors)
  const errors = globalErrors?.filter((e) => e.path.join('.') === path)
  if (!errors?.length) return null
  return (
    <Callout intent="danger" icon={null} className="mt-1 p-2 text-xs">
      {errors.map(({ path, message }) => (
        <p key={path.join()}>
          {getLabeledPath(path)}: {message}
        </p>
      ))}
    </Callout>
  )
}
