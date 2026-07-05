import { Callout, FormGroup, InputGroup, Radio, RadioGroup, TextArea } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { useImmerAtom } from 'jotai-immer'
import { memo } from 'react'
import { Paths } from 'type-fest'

import { i18n, useTranslation } from '../../i18n/i18n'
import { isCustomLevel } from '../../models/level'
import { DifficultyPicker } from './DifficultyPicker'
import { LevelSelect } from './LevelSelect'
import { editorAtoms, useEdit } from './editor-state'
import { CopilotOperation, getLabeledPath } from './validation/schema'

interface InfoEditorProps {
  className?: string
}

export const InfoEditor = memo(({ className }: InfoEditorProps) => {
  const [info, setInfo] = useImmerAtom(editorAtoms.operationBase)
  const [metadata, setMetadata] = useImmerAtom(editorAtoms.metadata)
  const edit = useEdit()
  const t = useTranslation()

  return (
    <div
      className={clsx(
        'p-4 md:[&>.bp6-form-group]:flex-row md:[&>.bp6-form-group>.bp6-label]:w-20',
        '[&_[type="text"]]:!border-0 [&_textarea]:!outline-none [&_[type="text"]]:shadow-[inset_0_0_2px_0_rgba(0,0,0,0.4)] [&_textarea:not(:focus)]:!shadow-[inset_0_0_2px_0_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <h3 className="mb-2 text-lg font-bold">{t.components.editor2.InfoEditor.job_info}</h3>
      <FormGroup contentClassName="grow" label={t.components.editor2.InfoEditor.stage} labelInfo="*">
        <LevelSelect
          difficulty={info.difficulty}
          value={info.stageName}
          onChange={(stageId, level) => {
            edit(() => {
              setInfo((prev) => {
                prev.stageName = stageId

                if (level && !prev.doc.title) {
                  // 如果没有标题，则使用关卡名作为标题
                  prev.doc.title = isCustomLevel(level)
                    ? level.name
                    : [level.catTwo, level.catThree, level.name].filter(Boolean).join(' - ')
                }
              })
              return {
                action: 'update-level',
                desc: i18n.actions.editor2.set_level,
              }
            })
          }}
        />
        <FieldError path="stage_name" />
      </FormGroup>
      <FormGroup contentClassName="grow" label={t.components.editor2.InfoEditor.difficulty}>
        <DifficultyPicker
          stageName={info.stageName}
          value={info.difficulty}
          onChange={(value, programmatically) => {
            edit((get, set, skip) => {
              setInfo((prev) => {
                prev.difficulty = value
              })
              // 如果是由于关卡变化而导致的难度变化，则不需要 checkpoint
              if (programmatically) {
                return skip
              }
              return {
                action: 'update-difficulty',
                desc: i18n.actions.editor2.set_difficulty,
              }
            })
          }}
        />
        <FieldError path="difficulty" />
      </FormGroup>
      <FormGroup contentClassName="grow" label={t.components.editor2.InfoEditor.title} labelInfo="*">
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
      <FormGroup contentClassName="grow" label={t.components.editor2.InfoEditor.description}>
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
      <FormGroup className="mb-0" contentClassName="grow" label={t.components.editor2.InfoEditor.visibility}>
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
            <span className="ml-2 text-xs opacity-50">{t.components.editor2.InfoEditor.private_note}</span>
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
