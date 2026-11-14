import { NonIdealState } from '@blueprintjs/core'

import { useTranslation } from '../../../../i18n/i18n'

export const OperatorNoData = () => {
  const t = useTranslation()
  return <NonIdealState title={t.components.editor.operator.sheet.SheetNoneData.no_operators} />
}

export const GroupNoData = () => {
  const t = useTranslation()
  return <NonIdealState title={t.components.editor.operator.sheet.SheetNoneData.no_groups} />
}
