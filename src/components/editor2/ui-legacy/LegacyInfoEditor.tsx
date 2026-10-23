import {
  Alert,
  AnchorButton,
  Button,
  ButtonGroup,
  Callout,
  FormGroup,
  H4,
  InputGroup,
  MenuItem,
  Radio,
  RadioGroup,
  Tag,
  TextArea,
  Tooltip,
} from '@blueprintjs/core'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import { useAtomValue } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { FC, useEffect, useMemo, useState } from 'react'

import { useLevels } from '../../../apis/level'
import { i18n, useTranslation } from '../../../i18n/i18n'
import {
  isCustomLevel,
  createCustomLevel,
  findLevelByStageName,
  getPrtsMapUrl,
  getStageIdWithDifficulty,
  hasHardMode,
  isHardMode,
  toNormalMode,
} from '../../../models/level'
import { CopilotType, Level, OpDifficulty, OpDifficultyBitFlag } from '../../../models/operation'
import { formatError } from '../../../utils/error'
import { Suggest } from '../../Suggest'
import { editorAtoms, useEdit } from '../core/editor-state'
import { useLegacyFloatingMap } from './LegacyFloatingMapContext'

export const LegacyInfoEditor: FC = () => {
  const [info, setInfo] = useImmerAtom(editorAtoms.operationBase)
  const metadata = useAtomValue(editorAtoms.metadata)
  const actions = useAtomValue(editorAtoms.actions)
  const edit = useEdit()
  const t = useTranslation()
  const [pendingType, setPendingType] = useState<CopilotType | null>(null)

  const applyTypeChange = (type: CopilotType) => {
    edit((get, set) => {
      set(editorAtoms.metadata, (prev) => ({
        ...prev,
        type,
        videoUrl: type === CopilotType.PRTS ? '' : prev.videoUrl,
      }))
      if (type === CopilotType.VIDEO) set(editorAtoms.actions, [])
      return { action: 'update-type', desc: i18n.components.CopilotTypePicker.type_label }
    })
  }
  const requestTypeChange = (next: CopilotType) => {
    if (next === metadata.type) return
    if ((next === CopilotType.VIDEO && actions.length > 0) || (next === CopilotType.PRTS && !!metadata.videoUrl)) {
      setPendingType(next)
    } else {
      applyTypeChange(next)
    }
  }

  const confirmTypeChange = () => {
    if (pendingType) applyTypeChange(pendingType)
    setPendingType(null)
  }

  const updateInfo = (action: string, desc: string, update: (draft: typeof info) => void, squashBy?: string) => {
    edit(() => {
      setInfo(update)
      return { action, desc, squashBy }
    })
  }

  return (
    <section className="px-8 pt-4">
      <H4>{t.components.editor.OperationEditor.job_metadata}</H4>
      <FormGroup
        className="mb-2"
        contentClassName="grow"
        label={t.components.CopilotTypePicker.type_label}
        labelInfo={metadata.typeLocked ? undefined : '*'}
      >
        <ButtonGroup>
          <Button
            active={metadata.type === CopilotType.PRTS}
            intent={metadata.type === CopilotType.PRTS ? 'primary' : 'none'}
            disabled={metadata.typeLocked}
            onClick={() => requestTypeChange(CopilotType.PRTS)}
          >
            {t.components.CopilotTypePicker.type_prts}
          </Button>
          <Button
            active={metadata.type === CopilotType.VIDEO}
            intent={metadata.type === CopilotType.VIDEO ? 'primary' : 'none'}
            disabled={metadata.typeLocked}
            onClick={() => requestTypeChange(CopilotType.VIDEO)}
          >
            {t.components.CopilotTypePicker.type_video}
          </Button>
        </ButtonGroup>
        <Callout intent={metadata.typeLocked ? 'none' : 'warning'} icon={null} className="mt-2 text-xs">
          {metadata.typeLocked ? (
            <span>
              <Tag minimal className="mr-1">
                {metadata.type === CopilotType.VIDEO
                  ? t.components.CopilotTypePicker.type_video
                  : t.components.CopilotTypePicker.type_prts}
              </Tag>
              {t.components.CopilotTypePicker.immutable_locked}
            </span>
          ) : (
            t.components.CopilotTypePicker.immutable_hint
          )}
        </Callout>
      </FormGroup>
      {metadata.type === CopilotType.VIDEO && (
        <div className="mb-4">
          <FormGroup
            className="mb-0"
            contentClassName="grow"
            label={t.components.CopilotTypePicker.video_url}
            labelInfo="*"
            helperText={t.components.CopilotTypePicker.video_url_helper}
          >
            <InputGroup
              large
              fill
              placeholder={t.components.CopilotTypePicker.video_url_placeholder}
              value={metadata.videoUrl || ''}
              onChange={(event) => {
                const videoUrl = event.target.value
                edit((get, set) => {
                  set(editorAtoms.metadata, (prev) => ({ ...prev, videoUrl }))
                  return { action: 'update-video-url', desc: i18n.components.CopilotTypePicker.video_url, squashBy: '' }
                })
              }}
            />
          </FormGroup>
        </div>
      )}
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/4 md:mr-8">
          <LegacyStageNameInput
            value={info.stageName ?? ''}
            difficulty={info.difficulty ?? OpDifficulty.UNKNOWN}
            onChange={(stageName, level) =>
              edit(() => {
                setInfo((draft) => {
                  draft.stageName = stageName
                  if (level && !draft.doc.title) {
                    draft.doc.title = isCustomLevel(level)
                      ? level.name
                      : [level.catTwo, level.catThree, level.name].filter(Boolean).join(' - ')
                  }
                })
                return { action: 'update-level', desc: i18n.actions.editor2.set_level }
              })
            }
          />
        </div>
        <div className="w-full md:w-3/4">
          <FormGroup label={t.components.editor.OperationEditor.job_title} labelInfo="*">
            <InputGroup
              large
              id="doc.title"
              placeholder={t.components.editor.OperationEditor.title_placeholder}
              value={info.doc.title || ''}
              onChange={(event) =>
                updateInfo(
                  'update-title',
                  i18n.actions.editor2.set_title,
                  (draft) => ({
                    ...draft,
                    doc: { ...draft.doc, title: event.target.value },
                  }),
                  '',
                )
              }
              onBlur={() => edit()}
            />
          </FormGroup>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/4 md:mr-8">
          <LegacyDifficultyPicker
            stageName={info.stageName ?? ''}
            value={info.difficulty ?? OpDifficulty.UNKNOWN}
            onChange={(difficulty, programmatically) =>
              edit((get, set, skip) => {
                setInfo((draft) => ({ ...draft, difficulty }))
                return programmatically
                  ? skip
                  : { action: 'update-difficulty', desc: i18n.actions.editor2.set_difficulty }
              })
            }
          />
        </div>
        <div className="w-full md:w-3/4">
          <FormGroup label={t.components.editor.OperationEditor.job_description}>
            <TextArea
              fill
              rows={4}
              autoResize
              large
              id="doc.details"
              placeholder={t.components.editor.OperationEditor.description_placeholder}
              value={info.doc.details || ''}
              onChange={(event) =>
                updateInfo(
                  'update-details',
                  i18n.actions.editor2.set_description,
                  (draft) => ({
                    ...draft,
                    doc: { ...draft.doc, details: event.target.value },
                  }),
                  '',
                )
              }
              onBlur={() => edit()}
            />
          </FormGroup>
        </div>
      </div>
      <FormGroup label={t.components.editor2.InfoEditor.visibility}>
        <RadioGroup
          inline
          selectedValue={metadata.visibility}
          onChange={(event) =>
            edit((get, set) => {
              set(editorAtoms.metadata, (prev) => ({
                ...prev,
                visibility: event.currentTarget.value as 'public' | 'private',
              }))
              return { action: 'update-visibility', desc: i18n.actions.editor2.set_visibility, squashBy: '' }
            })
          }
        >
          <Radio value="public">{t.components.editor2.InfoEditor.public}</Radio>
          <Radio value="private">{t.components.editor2.InfoEditor.private}</Radio>
        </RadioGroup>
      </FormGroup>
      <Alert
        intent="warning"
        icon="warning-sign"
        cancelButtonText={t.components.Confirm.cancel}
        confirmButtonText={t.components.Confirm.confirm}
        isOpen={pendingType !== null}
        onCancel={() => setPendingType(null)}
        onConfirm={confirmTypeChange}
      >
        {pendingType === CopilotType.VIDEO
          ? t.pages.create.switch_to_video_warning
          : t.pages.create.switch_to_prts_warning}
      </Alert>
    </section>
  )
}

interface LegacyStageNameInputProps {
  value: string
  difficulty: OpDifficulty
  onChange: (value: string, level?: Level) => void
}

const LegacyStageNameInput: FC<LegacyStageNameInputProps> = ({ value, difficulty, onChange }) => {
  const t = useTranslation()
  const { data, error, isLoading } = useLevels()
  const levels = useMemo(
    () => (data || []).filter((level) => !isHardMode(level.stageId)).sort((a, b) => a.levelId.localeCompare(b.levelId)),
    [data],
  )
  const fuse = useMemo(
    () => new Fuse(levels, { keys: ['name', 'catOne', 'catTwo', 'catThree'], threshold: 0.3 }),
    [levels],
  )
  const selectedLevel = useMemo(
    () => (value ? findLevelByStageName(levels, value) || createCustomLevel(value) : null),
    [levels, value],
  )
  const { setLevel } = useLegacyFloatingMap()
  const mapUrl = selectedLevel ? getPrtsMapUrl(getStageIdWithDifficulty(selectedLevel.stageId, difficulty)) : undefined

  useEffect(() => setLevel(selectedLevel || undefined), [selectedLevel, setLevel])

  return (
    <FormGroup
      label={useTranslation().components.editor.OperationEditor.stage}
      labelInfo="*"
      helperText={
        error
          ? formatError(error)
          : [
              t.components.editor.OperationEditor.type_to_search,
              t.components.editor.OperationEditor.for_main_event_stages,
              t.components.editor.OperationEditor.for_paradox_stages,
            ].map((text) => <p key={text}>{text}</p>)
      }
    >
      <div className="flex">
        <Suggest<Level>
          items={levels}
          itemListPredicate={(query) => (query ? fuse.search(query).map((result) => result.item) : levels)}
          onReset={() => onChange('')}
          className={clsx('flex-grow mr-2', isLoading && 'bp6-skeleton')}
          disabled={isLoading}
          itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
            <MenuItem
              key={item.stageId}
              text={`${item.catThree} ${item.name}`}
              onClick={handleClick}
              onFocus={handleFocus}
              selected={modifiers.active}
              disabled={modifiers.disabled}
            />
          )}
          selectedItem={selectedLevel}
          onItemSelect={(level) => onChange(toNormalMode(level.stageId), level)}
          inputValueRenderer={(level) =>
            isCustomLevel(level)
              ? `${level.name} (${t.components.editor.OperationEditor.custom})`
              : `${level.catThree} ${level.name}`
          }
          noResults={<MenuItem disabled text={t.components.editor.OperationEditor.no_matching_stages} />}
          createNewItemFromQuery={(query) => createCustomLevel(query)}
          createNewItemRenderer={(query, active, handleClick) => (
            <MenuItem
              key="create-new-item"
              text={t.components.editor.OperationEditor.use_custom_stage({ query })}
              icon="text-highlight"
              onClick={handleClick}
              selected={active}
            />
          )}
          inputProps={{ placeholder: t.components.editor.OperationEditor.stage, large: true }}
        />
        <Tooltip placement="top" content={t.components.editor.OperationEditor.view_in_prts_map}>
          <AnchorButton large icon="share" target="_blank" href={mapUrl} disabled={!mapUrl} />
        </Tooltip>
      </div>
    </FormGroup>
  )
}

interface LegacyDifficultyPickerProps {
  stageName: string
  value: OpDifficulty
  onChange: (value: OpDifficulty, programmatically?: boolean) => void
}

const LegacyDifficultyPicker: FC<LegacyDifficultyPickerProps> = ({ stageName, value, onChange }) => {
  const t = useTranslation()
  const { data: levels = [] } = useLevels()
  const invalid = useMemo(() => {
    if (!findLevelByStageName(levels, stageName)) return false
    return !hasHardMode(levels, stageName)
  }, [levels, stageName])

  useEffect(() => {
    if (invalid && value !== OpDifficulty.UNKNOWN) onChange(OpDifficulty.UNKNOWN, true)
  }, [invalid, onChange, value])

  const toggle = (bit: OpDifficultyBitFlag) => onChange(value ^ bit)

  return (
    <FormGroup
      label={t.components.editor.OperationEditor.stage_difficulty}
      helperText={invalid ? t.components.editor.OperationEditor.no_challenge_mode : undefined}
    >
      <ButtonGroup>
        <Button
          disabled={invalid}
          active={!!(value & OpDifficultyBitFlag.REGULAR)}
          onClick={() => toggle(OpDifficultyBitFlag.REGULAR)}
        >
          {t.components.editor.OperationEditor.normal}
        </Button>
        <Button
          disabled={invalid}
          active={!!(value & OpDifficultyBitFlag.HARD)}
          onClick={() => toggle(OpDifficultyBitFlag.HARD)}
        >
          {t.components.editor.OperationEditor.challenge}
        </Button>
      </ButtonGroup>
    </FormGroup>
  )
}
