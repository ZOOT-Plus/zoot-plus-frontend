import { Alert, Button, ButtonGroup, Callout, FormGroup, InputGroup, Tag } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { useTranslation } from '../../i18n/i18n'
import { CopilotType } from '../../models/operation'

interface CopilotTypePickerProps {
  type: CopilotType
  /** 编辑模式下锁定：true 时禁用切换并展示「创建后不可更改」提示。 */
  locked?: boolean
  onChange: (type: CopilotType) => void
}

/**
 * 作业类型选择器（PRTS 动作序列 / VIDEO 攻略视频）。类型创建后不可更改：
 * 创建时可选；编辑时锁定。切换类型的清空确认由调用方处理（见 switchToType）。
 */
export const CopilotTypePicker: FC<CopilotTypePickerProps> = ({ type, locked, onChange }) => {
  const t = useTranslation()

  return (
    <FormGroup
      className="mb-2"
      contentClassName="grow"
      label={t.components.CopilotTypePicker.type_label}
      labelInfo={locked ? undefined : '*'}
    >
      <ButtonGroup>
        <Button
          active={type === CopilotType.PRTS}
          intent={type === CopilotType.PRTS ? 'primary' : 'none'}
          disabled={locked}
          onClick={() => onChange(CopilotType.PRTS)}
        >
          {t.components.CopilotTypePicker.type_prts}
        </Button>
        <Button
          active={type === CopilotType.VIDEO}
          intent={type === CopilotType.VIDEO ? 'primary' : 'none'}
          disabled={locked}
          onClick={() => onChange(CopilotType.VIDEO)}
        >
          {t.components.CopilotTypePicker.type_video}
        </Button>
      </ButtonGroup>
      <Callout intent={locked ? 'none' : 'warning'} icon={null} className="mt-2 text-xs">
        {locked ? (
          <span>
            <Tag minimal className="mr-1">
              {type === CopilotType.VIDEO
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
  )
}

interface VideoUrlFieldProps {
  value: string
  onChange: (value: string) => void
}

/** 视频链接输入框，仅在 type=VIDEO 时由调用方渲染。 */
export const VideoUrlField: FC<VideoUrlFieldProps> = ({ value, onChange }) => {
  const t = useTranslation()
  return (
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
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormGroup>
  )
}

/**
 * 类型切换确认弹窗。切换会清除对应的动作序列 / 视频链接，有数据丢失时由
 * useTypeSwitchConfirm 拦截并弹出此 Alert，确认后调用方执行实际的清空 + 类型变更。
 */
export const TypeSwitchConfirmAlert: FC<{
  pendingType: CopilotType | null
  onCancel: () => void
  onConfirm: () => void
}> = ({ pendingType, onCancel, onConfirm }) => {
  const t = useTranslation()
  return (
    <Alert
      intent="warning"
      icon="warning-sign"
      cancelButtonText={t.components.Confirm.cancel}
      confirmButtonText={t.components.Confirm.confirm}
      isOpen={pendingType !== null}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {pendingType === CopilotType.VIDEO
        ? t.pages.create.switch_to_video_warning
        : t.pages.create.switch_to_prts_warning}
    </Alert>
  )
}

/**
 * 封装类型切换的「有数据丢失则先弹窗确认」逻辑。apply 由调用方提供
 *（操作 react-hook-form 或 jotai atom 的差异在这里分流）。
 */
export function useTypeSwitchConfirm(opts: {
  currentType: CopilotType
  hasActions: () => boolean
  hasVideoUrl: () => boolean
  apply: (next: CopilotType) => void
}) {
  const [pendingType, setPendingType] = useState<CopilotType | null>(null)

  const requestChange = (next: CopilotType) => {
    if (next === opts.currentType) return
    const willLoseActions = next === CopilotType.VIDEO && opts.hasActions()
    const willLoseVideo = next === CopilotType.PRTS && opts.hasVideoUrl()
    if (willLoseActions || willLoseVideo) {
      setPendingType(next)
    } else {
      opts.apply(next)
    }
  }

  const cancel = () => setPendingType(null)
  const confirm = () => {
    if (pendingType) opts.apply(pendingType)
    setPendingType(null)
  }

  return { pendingType, requestChange, cancel, confirm }
}