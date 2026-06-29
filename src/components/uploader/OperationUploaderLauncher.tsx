import { Button, Drawer } from '@blueprintjs/core'

import { FC, useState } from 'react'

import { OperationUploader } from 'components/uploader/OperationUploader'

import { useTranslation } from '../../i18n/i18n'

export const OperationUploaderLauncher: FC = () => {
  const t = useTranslation()
  const [uploaderActive, setUploaderActive] = useState(false)

  return (
    <>
      <Drawer size="560px" isOpen={uploaderActive} onClose={() => setUploaderActive(false)}>
        <OperationUploader />
      </Drawer>

      <Button large fill icon="cloud-upload" onClick={() => setUploaderActive(true)}>
        {t.components.uploader.OperationUploaderLauncher.upload_local_jobs}
      </Button>
    </>
  )
}
