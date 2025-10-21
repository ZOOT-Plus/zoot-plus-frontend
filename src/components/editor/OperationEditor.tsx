import {
  AnchorButton,
  Button,
  Callout,
  H4,
  Icon,
  InputGroup,
  MenuItem,
  TextArea,
} from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import { useLevels } from 'apis/level'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Control,
  FieldErrors,
  UseFormReturn,
  useController,
  useWatch,
} from 'react-hook-form'

import { FormField, FormField2 } from 'components/FormField'
import { HelperText } from 'components/HelperText'
import type { CopilotDocV1 } from 'models/copilot.schema'
import { Level, OpDifficulty } from 'models/operation'

import { useTranslation } from '../../i18n/i18n'
import {
  compareLevelsForDisplay,
  createCustomLevel,
  findLevelByStageName,
  getPrtsMapUrl,
  getStageIdWithDifficulty,
  isCustomLevel,
  isHardMode,
  toNormalMode,
} from '../../models/level'
import { useBreakpoint } from '../../utils/device'
import { formatError } from '../../utils/error'
import { Suggest } from '../Suggest'
import { EditorActions } from './action/EditorActions'
import { FloatingMap } from './floatingMap/FloatingMap'
import {
  FloatingMapContext,
  useFloatingMap,
} from './floatingMap/FloatingMapContext'
import {
  EditorPerformer,
  EditorPerformerProps,
} from './operator/EditorPerformer'

export const StageNameInput: FC<{
  control: Control<CopilotDocV1.Operation, object>
}> = ({ control }) => {
  const t = useTranslation()
  const {
    field: { value, onChange, onBlur },
    fieldState,
  } = useController({
    name: 'stageName',
    control,
    rules: { required: t.components.editor.OperationEditor.stage_required },
  })

  // we are going to manually handle loading state so we could show the skeleton state easily,
  // without swapping the actual element.
  const { data, error: levelError, isLoading } = useLevels()

  const levels = useMemo(
    () =>
      data
        // to simplify the list, we only show levels in normal mode
        .filter((level) => !isHardMode(level.stageId))
        .sort(compareLevelsForDisplay) || [],
    [data],
  )

  const fuse = useMemo(
    () =>
      new Fuse(levels, {
        keys: ['name', 'catOne', 'catTwo', 'catThree'],
        threshold: 0.3,
      }),
    [levels],
  )

  const selectedLevel = useMemo(
    () =>
      value
        ? findLevelByStageName(levels, value) || createCustomLevel(value)
        : // return null to ensure the component is controlled
          null,
    [levels, value],
  )

  const difficulty = useWatch({ control, name: 'difficulty' })
  const prtsMapUrl = selectedLevel
    ? getPrtsMapUrl(
        getStageIdWithDifficulty(
          selectedLevel.stageId,
          difficulty ?? OpDifficulty.UNKNOWN,
        ),
      )
    : undefined

  // stageName should always be in normal mode
  const selectLevel = (level: Level) => onChange(toNormalMode(level.stageId))

  const { setLevel } = useFloatingMap()

  useEffect(() => {
    setLevel(selectedLevel || undefined)
  }, [selectedLevel, setLevel])

  return (
    <FormField2
      label={t.components.editor.OperationEditor.stage}
      field="stageName"
      error={levelError ? formatError(levelError) : fieldState.error}
      asterisk
      FormGroupProps={{
        helperText: (
          <>
            <p>{t.components.editor.OperationEditor.type_to_search}</p>
            <p>{t.components.editor.OperationEditor.for_main_event_stages}</p>
            <p>{t.components.editor.OperationEditor.for_paradox_stages}</p>
          </>
        ),
      }}
    >
      <div className="flex">
        <Suggest<Level>
          items={levels}
          itemListPredicate={(query) =>
            query ? fuse.search(query).map((el) => el.item) : levels
          }
          fieldState={fieldState}
          onReset={() => onChange('')}
          className={clsx('flex-grow mr-2', isLoading && 'bp4-skeleton')}
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
          onItemSelect={selectLevel}
          inputValueRenderer={(item) =>
            isCustomLevel(item)
              ? `${item.name} (${t.components.editor.OperationEditor.custom})`
              : `${item.catThree} ${item.name}`
          }
          noResults={
            <MenuItem
              disabled
              text={t.components.editor.OperationEditor.no_matching_stages}
            />
          }
          createNewItemFromQuery={(query) => createCustomLevel(query)}
          createNewItemRenderer={(query, active, handleClick) => (
            <MenuItem
              key="create-new-item"
              text={t.components.editor.OperationEditor.use_custom_stage({
                query,
              })}
              icon="text-highlight"
              onClick={handleClick}
              selected={active}
            />
          )}
          inputProps={{
            placeholder: t.components.editor.OperationEditor.stage,
            large: true,
            onBlur,
          }}
        />
        <Tooltip2
          placement="top"
          content={t.components.editor.OperationEditor.view_in_prts_map}
        >
          <AnchorButton
            large
            icon="share"
            target="_blank"
            href={prtsMapUrl}
            disabled={!prtsMapUrl}
          />
        </Tooltip2>
      </div>
    </FormField2>
  )
}

const DifficultyPicker: FC<{
  control: Control<CopilotDocV1.Operation>
}> = ({ control }) => {
  const {
    field: { value, onChange },
  } = useController({
    name: 'difficulty',
    control,
  })

  useEffect(() => {
    if (value === undefined) {
      onChange(OpDifficulty.UNKNOWN)
    }
  }, [value, onChange])

  return null
}

export interface OperationEditorProps {
  form: UseFormReturn<CopilotDocV1.Operation>
  toolbar: ReactNode
}

export const OperationEditor: FC<OperationEditorProps> = ({
  form: {
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  },
  toolbar,
}) => {
  const t = useTranslation()
  const { data: levels } = useLevels()

  const stageName = watch('stageName')

  const breakpoint = useBreakpoint()

  // set default title if not set
  useEffect(() => {
    if (!getValues('doc.title')) {
      const level = findLevelByStageName(levels, stageName)

      if (level) {
        const normalizedName = level.name?.trim()
        setValue(
          'doc.title',
          normalizedName?.length ? normalizedName : level.stageId,
        )
      }
    }
  }, [stageName, levels, getValues, setValue])

  const globalError = (errors as FieldErrors<{ global: void }>).global?.message

  return (
    <FloatingMapContext>
      <section className="flex flex-col relative h-full pt-4 pb-16">
        <div className="px-8 text-lg font-medium flex items-center flex-wrap w-full">
          <Icon icon="document" />
          <span className="ml-2 mr-4">
            {t.components.editor.OperationEditor.job_editor}
          </span>
          <div className="flex-1" />

          {toolbar}
        </div>

        {globalError && (
          <Callout
            className="mt-4"
            intent="danger"
            icon="error"
            title={t.components.editor.OperationEditor.error}
          >
            {globalError.split('\n').map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Callout>
        )}

        <div className="px-8 mr-0.5">
          <H4>{t.components.editor.OperationEditor.job_metadata}</H4>
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/4 md:mr-8">
              <StageNameInput control={control} />
            </div>
            <div className="w-full md:w-3/4">
              <FormField
                label={t.components.editor.OperationEditor.job_title}
                field="doc.title"
                control={control}
                error={errors.doc?.title}
                ControllerProps={{
                  rules: {
                    required:
                      t.components.editor.OperationEditor.title_required,
                  },
                  render: ({ field }) => (
                    <InputGroup
                      large
                      id="doc.title"
                      placeholder={
                        t.components.editor.OperationEditor.title_placeholder
                      }
                      {...field}
                      value={field.value || ''}
                    />
                  ),
                }}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="hidden">
              <DifficultyPicker control={control} />
            </div>
            <div className="w-full">
              <FormField
                label={t.components.editor.OperationEditor.job_description}
                field="doc.details"
                control={control}
                error={errors.doc?.details}
                ControllerProps={{
                  render: ({ field }) => (
                    <TextArea
                      fill
                      rows={4}
                      growVertically
                      large
                      id="doc.details"
                      placeholder={
                        t.components.editor.OperationEditor
                          .description_placeholder
                      }
                      {...field}
                      value={field.value || ''}
                    />
                  ),
                }}
              />
            </div>
          </div>

          <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

          <div className="flex flex-col min-h-[calc(100vh-6rem)]">
            <div className="w-full flex flex-col pb-8">
              <EditorPerformerPanel control={control} />
            </div>
            <div className="w-full pb-8">
              <H4>{t.components.editor.OperationEditor.action_sequence}</H4>
              <HelperText className="mb-4">
                <span>
                  {t.components.editor.OperationEditor.drag_to_reorder}
                </span>
              </HelperText>
              <EditorActions control={control} />
            </div>
          </div>
        </div>

        {breakpoint !== 'tablet' && <FloatingMap />}
      </section>
    </FloatingMapContext>
  )
}

const EditorPerformerPanel: FC<EditorPerformerProps> = (props) => {
  const t = useTranslation()
  const [reload, setReload] = useState(false)

  // temporary workaround for https://github.com/clauderic/dnd-kit/issues/799
  if (reload) {
    setTimeout(() => setReload(false), 100)
    return null
  }

  return (
    <>
      <H4>{t.components.editor.OperationEditor.operators_and_groups}</H4>
      <HelperText className="mb-4">
        <span>
          {t.components.editor.OperationEditor.drag_to_reorder_operators}
        </span>
        <span>
          {t.components.editor.OperationEditor.drag_too_fast_issue}
          <Button
            minimal
            className="!inline !p-0 !min-h-0 ![font-size:inherit] !leading-none !align-baseline underline"
            onClick={() => setReload(true)}
          >
            {t.components.editor.OperationEditor.refresh_ui}
          </Button>
          {t.components.editor.OperationEditor.to_fix_no_data_loss}
        </span>
      </HelperText>
      <EditorPerformer {...props} />
    </>
  )
}
