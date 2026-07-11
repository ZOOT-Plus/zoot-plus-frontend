import { cloneDeep, isObject } from 'lodash-es'
import {
  ArkLevelControllerApi,
  CommentAreaApi,
  Configuration,
  CopilotControllerApi,
  CopilotSetApi,
  CopilotUserApi,
  JSONApiResponse,
  UserFollowApi,
  querystring,
} from 'maa-copilot-client'

import { ApiError, InvalidTokenError, NetworkError, TokenExpiredError, UnauthorizedError } from 'utils/error'
import { getDefaultStore } from 'jotai'
import { TokenManager } from 'utils/token-manager'

import { AppToaster } from '../components/Toaster'
import { i18n } from '../i18n/i18n'
import { authAtom } from '../store/auth'

declare module 'maa-copilot-client' {
  interface Configuration {
    options?: ApiOptions
  }
}

interface ApiOptions {
  /**
   * 是否发送 token
   * @default 'always' - token 不存在时抛出错误
   */
  sendToken?: 'always' | 'never' | 'optional'

  /**
   * 确保返回值中包含 statusCode: 200，否则抛出错误
   * @default 'if-object' - 仅当返回值是对象时检查
   */
  validateStatusCode?: 'always' | 'never' | 'if-object'

  /**
   * 确保返回值中包含 data 且不为 null 或 undefined，否则抛出错误
   * @default false
   */
  requireData?: boolean
}

if (!import.meta.env.VITE_API) {
  throw new Error('env var VITE_API is not set')
}

const API_URL = import.meta.env.VITE_API

// 把函数返回值里的 data 字段标记为 required 且非空
// （requireData: true 时运行时已校验 data 存在，见下方 JSONApiResponse.value 拦截）
type RequireData<T> = T extends (...params: infer P) => Promise<infer R>
  ? R extends { data?: any }
    ? (...params: P) => Promise<Omit<R, 'data'> & { data: NonNullable<R['data']> }>
    : T
  : T

type WithOptions<T> = {
  new <O extends ApiOptions>(
    config: Configuration,
  ): {
    [K in keyof T]: O extends { requireData: true } ? RequireData<T[K]> : T[K]
  }
}

// 正常情况下，如果 options 里有多余的属性，TS 不会报错，因为符合 extends ApiOption 的条件，
// 但这样会掩盖掉写错属性名称的问题，所以这里加个检查，如果有多余的属性，
// 就把类型切换为 ApiOptions，这样 TS 就会正常报错并提示多余的属性
type ValidateOptions<T> = keyof T extends keyof ApiOptions ? T : ApiOptions

export class UserApi<T extends ApiOptions> extends (CopilotUserApi as WithOptions<CopilotUserApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}
export class CommentApi<T extends ApiOptions> extends (CommentAreaApi as WithOptions<CommentAreaApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}
export class OperationApi<T extends ApiOptions> extends (CopilotControllerApi as WithOptions<CopilotControllerApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}
export class OperationSetApi<T extends ApiOptions> extends (CopilotSetApi as WithOptions<CopilotSetApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}
export class LevelApi<T extends ApiOptions> extends (ArkLevelControllerApi as WithOptions<ArkLevelControllerApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}
export class FollowApi<T extends ApiOptions> extends (UserFollowApi as WithOptions<UserFollowApi>)<T> {
  constructor(options?: ValidateOptions<T>) {
    super(createConfiguration(options as T))
  }
}

function createConfiguration(options?: ApiOptions) {
  options = {
    validateStatusCode: 'if-object',
    requireData: false,
    ...options,
  }

  const config = new Configuration({
    basePath: API_URL,
    middleware: [
      {
        async pre({ init }) {
          if (options.sendToken !== 'never') {
            try {
              const token = await TokenManager.updateAndGetToken()

              init.headers = new Headers(init.headers)
              init.headers.set('Authorization', `Bearer ${token}`)
            } catch (e) {
              if (options.sendToken === 'always') {
                throw e
              }
              if (e instanceof InvalidTokenError || e instanceof TokenExpiredError) {
                const store = getDefaultStore()
                store.set(authAtom, {})
                AppToaster.show({
                  intent: 'warning',
                  message: e.message,
                })
              }
            }
          }
        },
        async post({ init, response }) {
          if (response.status === 401) {
            if (init.headers instanceof Headers && init.headers.get('Authorization')) {
              throw new InvalidTokenError()
            }
            throw new UnauthorizedError()
          }

          if (!response.ok) {
            let message: string | undefined

            try {
              const contentType = response.headers.get('content-type')

              if (contentType?.includes('application/json')) {
                message = (await response.json()).message
              } else if (contentType?.includes('text/')) {
                message = await response.text()
              }
            } catch {
              // ignore
            }

            throw new ApiError(message, response.status)
          }

          ;(response as ExtendedResponse).config = config
          return response
        },

        // 只会在 fetch() reject 的时候触发
        async onError() {
          throw new NetworkError()
        },
      },
    ],

    // 默认的序列化会把 undefined 转成字符串，我真的会谢
    queryParamsStringify(params) {
      const removeUndefined = (obj: object) => {
        for (const key in obj) {
          if (obj[key] === undefined) {
            delete obj[key]
          } else if (isObject(obj[key])) {
            removeUndefined(obj[key])
          }
        }
      }

      params = cloneDeep(params)
      removeUndefined(params)

      return querystring(params)
    },
  })

  config.options = options

  return config
}

interface ExtendedResponse extends Response {
  config?: Configuration
}

const originalValueFunction = JSONApiResponse.prototype.value

// 这个函数是所有 json 接口的最终输出，也是唯一能拦截处理完后的的返回值的地方
JSONApiResponse.prototype.value = async function value() {
  const { config } = this.raw as ExtendedResponse
  const result = await originalValueFunction.call(this)

  if (!config?.options) {
    return result
  }

  const { validateStatusCode, requireData } = config.options

  if (validateStatusCode === 'always' || requireData) {
    if (!isObject(result)) {
      console.error('response is not an object', result)
      throw new ApiError(i18n.utils.api_client.invalid_response)
    }
  }

  if (validateStatusCode === 'always' || (validateStatusCode === 'if-object' && isObject(result))) {
    if (result.statusCode !== 200) {
      console.error('response.statusCode is not 200', result)
      throw new ApiError(result.message || i18n.utils.api_client.server_error)
    }
  }

  if (requireData && (result.data === undefined || result.data === null)) {
    console.error('response.data is missing', result)
    throw new ApiError(result.message || i18n.utils.api_client.invalid_response)
  }

  return result
}
