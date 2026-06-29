import { FormGroup, FormGroupProps, Icon, Tag, PopoverInteractionKind, Tooltip, TooltipProps } from '@blueprintjs/core'

import { ReactNode } from 'react'
import { Control, Controller, ControllerProps, FieldError, FieldValues, Path } from 'react-hook-form'
import { WithChildren } from 'types'

import { formatError } from '../utils/error'

export interface FormFieldRenderProps<T extends FieldValues, P extends Path<T>> {
  name: Path<T>
  control: Control<T>
  props?: Omit<ControllerProps<T, P>, 'name' | 'render'>
}

export interface FormFieldProps<T extends FieldValues, P extends Path<T>> {
  FormGroupProps?: Omit<FormGroupProps, 'label' | 'labelFor'>
  control: Control<T>
  error?: FieldError
  label: ReactNode
  field: P
  ControllerProps?: Omit<ControllerProps<T, P>, 'name'>
  description?: TooltipProps['content']
  render?: (props: FormFieldRenderProps<T, P>) => ReactNode
}

export const FormField = <T extends FieldValues, P extends Path<T>>({
  ControllerProps,
  FormGroupProps,
  control,
  error,
  label,
  field,
  description,
  render,
}: FormFieldProps<T, P>) => {
  return (
    <FormGroup
      label={
        <span>
          {label}
          {description && (
            <Tooltip
              className="!inline-block !mt-0"
              interactionKind={PopoverInteractionKind.HOVER}
              content={typeof description === 'string' ? <div className="max-w-sm">{description}</div> : description}
            >
              <Icon className="ml-1 text-slate-600" icon="help" />
            </Tooltip>
          )}
          {error && (
            <Tag minimal intent="danger" className="float-right">
              {formatError(error)}
            </Tag>
          )}
        </span>
      }
      labelFor={field}
      labelInfo={FormGroupProps?.labelInfo || (ControllerProps?.rules?.required && '*')}
      {...FormGroupProps}
    >
      {render ? (
        render({ name: field, control, props: ControllerProps })
      ) : (
        <Controller control={control} name={field} {...ControllerProps!} />
      )}
    </FormGroup>
  )
}

export interface FormField2Props<T extends FieldValues> {
  FormGroupProps?: Omit<FormGroupProps, 'label' | 'labelFor'>
  className?: string
  error?: any
  label: ReactNode
  field: Path<T>
  asterisk?: boolean
  description?: TooltipProps['content']
}

export const FormField2 = <T extends FieldValues>({
  FormGroupProps,
  className,
  error,
  label,
  field,
  asterisk,
  description,
  children,
}: WithChildren<FormField2Props<T>>) => {
  return (
    <FormGroup
      className={className}
      label={
        <div className="inline-block w-full">
          <span>{label}</span>
          {description && (
            <Tooltip
              className="!inline-block !mt-0"
              interactionKind={PopoverInteractionKind.HOVER}
              content={typeof description === 'string' ? <div className="max-w-sm">{description}</div> : description}
            >
              <Icon className="ml-1 text-slate-600" icon="help" />
            </Tooltip>
          )}
          {asterisk && <span className="ml-1 text-slate-600">*</span>}
          {error && (
            <Tag minimal intent="danger" className="float-right">
              {formatError(error)}
            </Tag>
          )}
        </div>
      }
      labelFor={field}
      {...FormGroupProps}
    >
      {children}
    </FormGroup>
  )
}
