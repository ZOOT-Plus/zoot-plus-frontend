import { Button, Card, Checkbox, TextArea } from '@blueprintjs/core'

import { sendComment } from 'apis/comment'
import clsx from 'clsx'
import { useContext, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { MAX_COMMENT_LENGTH } from '../../../models/comment'
import { formatError } from '../../../utils/error'
import { wrapErrorMessage } from '../../../utils/wrapErrorMessage'
import { Markdown } from '../../Markdown'
import { AppToaster } from '../../Toaster'
import { CommentAreaContext } from './CommentArea'

export interface CommentFormProps {
  className?: string
  primary?: boolean
  placeholder?: string
  inputAutoFocus?: boolean
  maxLength?: number
}

export const CommentForm = ({
  className,
  primary,
  placeholder,
  inputAutoFocus,
  maxLength = MAX_COMMENT_LENGTH,
}: CommentFormProps) => {
  const t = useTranslation()
  const { operationId, replyTo, reload } = useContext(CommentAreaContext)

  const defaultPlaceholder = t.components.viewer.comment.friendly_comment_placeholder

  const [message, setMessage] = useState('')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) {
      AppToaster.show({
        intent: 'primary',
        message: t.components.viewer.comment.enter_comment,
      })
      return
    }

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    await wrapErrorMessage(
      (e) => t.components.viewer.comment.submit_failed({ error: formatError(e) }),
      (async () => {
        if (primary) {
          // this comment is a main comment and does not reply to others
          await sendComment({ message, operationId })
        } else {
          if (!replyTo) {
            throw new Error(t.components.viewer.comment.reply_target_not_found)
          }
          await sendComment({
            message,
            operationId,
            fromCommentId: replyTo?.commentId,
          })
        }

        AppToaster.show({
          intent: 'success',
          message: t.components.viewer.comment.submit_success,
        })

        setMessage('')
      })(),
    ).catch(console.warn)

    reload()
    setIsSubmitting(false)
  }

  return (
    <form className={clsx(className)}>
      <TextArea
        fill
        rows={2}
        growVertically
        large
        maxLength={maxLength}
        placeholder={placeholder || defaultPlaceholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={inputAutoFocus}
      />

      <div className="mt-2 flex flex-wrap items-center">
        <Button icon="send-message" intent="primary" loading={isSubmitting} onClick={handleSubmit}>
          {primary ? t.components.viewer.comment.post_comment : t.components.viewer.comment.reply}
        </Button>

        <Checkbox
          className="mb-0 ml-6"
          checked={showMarkdownPreview}
          onChange={(e) => setShowMarkdownPreview((e.target as HTMLInputElement).checked)}
        >
          {t.components.viewer.comment.preview_markdown}
        </Checkbox>

        <div className="ml-auto text-slate-500 text-sm">
          {message.length}/{maxLength}
        </div>
      </div>

      {showMarkdownPreview && (
        <Card className="mt-2 border-2">
          <Markdown>{message || t.components.viewer.comment.no_content}</Markdown>
        </Card>
      )}
    </form>
  )
}
