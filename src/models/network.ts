export interface Response<T> {
  status_code: number
  message: string
  traceId: string
  data: T
}
