import { ApiError } from 'utils/error'
import { UserApi } from 'utils/maa-copilot-client'

export async function sendRegistrationEmail(req: { email: string }) {
  await new UserApi({ sendToken: 'never' }).sendRegistrationToken({
    sendRegistrationTokenDTO: req,
  })
}

export async function register(req: {
  email: string
  username: string
  password: string
  registrationToken?: string
  registrationCode?: string
}) {
  // 直接使用 fetch 发送原始 JSON，以兼容后端新增字段 registrationCode
  // 后端 DTO: RegisterDTO(email, userName, password, registrationToken?, registrationCode?)
  const api = (import.meta as any).env?.VITE_API as string
  if (!api) throw new ApiError('env var VITE_API is not set')

  const body: Record<string, any> = {
    email: req.email,
    userName: req.username,
    password: req.password,
  }
  if (req.registrationCode !== undefined) {
    body.registrationCode = req.registrationCode
  }
  if (req.registrationToken !== undefined) {
    body.registrationToken = req.registrationToken
  }

  const res = await fetch(`${api}/user/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  // HTTP 层错误：抛出并由 wrapErrorMessage 统一处理
  if (!res.ok) {
    let message: string | undefined
    try {
      const ct = res.headers.get('content-type')
      if (ct?.includes('application/json')) {
        message = (await res.json())?.message
      } else if (ct?.includes('text/')) {
        message = await res.text()
      }
    } catch {
      // ignore
    }
    throw new ApiError(message)
  }

  // 业务层错误：后端统一返回 MaaResult(statusCode, message, data)
  try {
    const ct = res.headers.get('content-type')
    if (ct?.includes('application/json')) {
      const data: any = await res.json()
      if (data && typeof data === 'object') {
        if ('statusCode' in data && data.statusCode !== 200) {
          throw new ApiError(data?.message)
        }
        // 兼容历史/其他接口的常见约定
        if ('success' in data && data.success === false) {
          throw new ApiError(data?.message)
        }
        if ('code' in data && data.code !== 0) {
          throw new ApiError(data?.message)
        }
      }
    }
  } catch (e) {
    // 如果解析失败（无响应体/非 JSON），忽略并按 HTTP 成功处理
    if (e instanceof ApiError) {
      throw e
    }
  }
}

export async function login(req: { email: string; password: string }) {
  const res = await new UserApi({
    sendToken: 'never',
    requireData: true,
  }).login({
    loginDTO: req,
  })
  return res.data
}

export async function refreshAccessToken(req: { refreshToken: string }) {
  const res = await new UserApi({
    sendToken: 'never',
    requireData: true,
  }).refresh({
    refreshReq: req,
  })
  return res.data
}

export async function updateUserInfo(req: { username: string }) {
  await new UserApi().updateInfo({
    userInfoUpdateDTO: {
      userName: req.username,
    },
  })
}

export async function updatePassword(req: {
  originalPassword: string
  newPassword: string
}) {
  await new UserApi().updatePassword({ passwordUpdateDTO: req })
}

export async function sendResetPasswordEmail(req: { email: string }) {
  await new UserApi({ sendToken: 'never' }).passwordResetRequest({
    passwordResetVCodeDTO: req,
  })
}

export function resetPassword(req: {
  email: string
  activeCode: string
  password: string
}) {
  return new UserApi({ sendToken: 'never' }).passwordReset({
    passwordResetDTO: req,
  })
}
