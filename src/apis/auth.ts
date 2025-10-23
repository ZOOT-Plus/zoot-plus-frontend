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
  // 注意：OpenAPI SDK 目前要求 registrationToken 必填且会丢弃未知字段，故绕过 SDK
  const api = (import.meta as any).env?.VITE_API as string
  if (!api) throw new ApiError('env var VITE_API is not set')

  const body: Record<string, any> = {
    email: req.email,
    user_name: req.username,
    password: req.password,
  }
  if (req.registrationCode !== undefined) {
    body.registration_code = req.registrationCode
  }
  if (req.registrationToken !== undefined) {
    body.registration_token = req.registrationToken
  }

  const res = await fetch(`${api}/user/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

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
