import { Button } from '@blueprintjs/core'

import { FC } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '../../i18n/i18n'

export const OperationEditorLauncher: FC = () => {
  const t = useTranslation()

  return (
    <>
      <Link to="/editor" className="!no-underline">
        <Button large fill icon="open-application">
          {t.components.editor.OperationEditorLauncher.launch_job_editor}
        </Button>
      </Link>
    </>
  )
}
