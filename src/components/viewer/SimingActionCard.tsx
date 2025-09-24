import { Card, Elevation, H6, Tag } from '@blueprintjs/core'
import { FC } from 'react'

import { CopilotDocV1 } from '../../models/copilot.schema'

interface SimingActionCardProps {
  name: string
  action: CopilotDocV1.SimingAction
}

export const SimingActionCard: FC<SimingActionCardProps> = ({ name, action }) => {
  const { textDoc, action: actionType, next, ...rest } = action

  const serialized = JSON.stringify(rest, null, 2)

  return (
    <Card elevation={Elevation.TWO} className="mb-3 last:mb-0">
      <div className="flex items-center justify-between gap-3">
        <H6 className="mb-0 break-all">{name}</H6>
        {actionType && <Tag minimal>{actionType}</Tag>}
      </div>

      {textDoc && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-200">
          {textDoc}
        </p>
      )}

      {serialized !== '{}' && (
        <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs leading-snug text-slate-800 dark:bg-slate-900 dark:text-slate-100">
          {serialized}
        </pre>
      )}

      {next?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((step) => (
            <Tag key={step} minimal intent="primary">
              {step}
            </Tag>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
