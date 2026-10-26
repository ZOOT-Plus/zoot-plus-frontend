import { FormGroup, FormGroupProps, Icon, PopoverInteractionKind, Tooltip } from '@blueprintjs/core'
import { FC, ReactNode } from 'react'

interface LegacyFormGroupProps extends Omit<FormGroupProps, 'label'> {
  label: ReactNode
  description?: ReactNode
}

export const LegacyFormGroup: FC<LegacyFormGroupProps> = ({ label, description, ...props }) => (
  <FormGroup
    label={
      <span>
        {label}
        {description && (
          <Tooltip
            className="!inline-block !mt-0"
            interactionKind={PopoverInteractionKind.HOVER}
            content={
              typeof description === 'string' ? <div className="max-w-sm">{description}</div> : <>{description}</>
            }
          >
            <Icon className="ml-1 text-slate-600 dark:text-slate-100" icon="help" />
          </Tooltip>
        )}
      </span>
    }
    {...props}
  />
)
