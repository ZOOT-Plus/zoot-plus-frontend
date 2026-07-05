import { ArrayPath, FieldPath, FieldValues, Path, PathValue, UseControllerProps } from 'react-hook-form'

import { Cast } from '../../types'

type PathOfType<T, P extends Path<T> | ArrayPath<T>, U> = P extends any
  ? PathValue<T, P> extends U
    ? P
    : never
  : never

/**
 * Declares a props type for Controller, the `name` of which is the paths to properties
 * that satisfy the type `TType`.
 *
 * @example
 * ```tsx
 * type A = { a: number, b: { c: number }, d: string }
 *
 * function foo({ name, control }: EditorFieldProps<A, number>) {
 *  // name is 'a' | 'b.c'
 *
 *  const { field: { value } } = useController({ name, control })
 *  // value is number
 * }
 * ```
 *
 * Unfortunately this does not work well with a generic input, as below:
 *
 * @example
 * ```tsx
 * type A = { a: number, b: number, c: string }
 *
 * function foo<T extends A>({ name, control }: EditorFieldProps<T, number>) {
 *  // name is never
 *
 *  const { field: { value } } = useController({ name, control })
 *  // value is never
 *
 *  // so you'll need a type assertion when using value...
 *  ;(value as string).length
 * }
 * ```
 */
export interface EditorFieldProps<TFieldValues extends FieldValues, TType = any> extends UseControllerProps<
  TFieldValues,
  // the Cast here is a workaround for the fact that TS cannot correctly recognize
  // that the result of PathOfType is assignable to FieldPath<TFieldValues>
  // refer to: https://github.com/microsoft/TypeScript/issues/46855#issuecomment-974484444
  Cast<
    PathOfType<
      // wrap in Require to prevent optional keys from being stripped
      Required<TFieldValues>,
      FieldPath<Required<TFieldValues>>,
      TType
    >,
    FieldPath<TFieldValues>
  >
> {}

export interface EditorFieldPropsByName<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {}
