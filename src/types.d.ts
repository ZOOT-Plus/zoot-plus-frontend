import type { OmitIndexSignature } from 'type-fest'

export type WithChildren<T> = T & { children?: React.ReactNode }
export type FCC<T = {}> = React.FC<WithChildren<T>>

export type Cast<T, U> = T extends U ? T : T & U

export type WithTempId<T = {}> = T & { _id?: string }

export type OmitIndexSignatureDeep<T, U = OmitIndexSignature<T>> = {
  [K in keyof T as K extends keyof U ? K : never]: K extends keyof U ? _OmitIndexSignatureDeepForValue<U[K]> : never
}
type _OmitIndexSignatureDeepForValue<T> = T extends unknown[]
  ? _OmitIndexSignatureDeepForValue<T[number]>[]
  : T extends object
    ? OmitIndexSignatureDeep<T>
    : T
