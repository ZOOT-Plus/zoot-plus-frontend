import { UserApi } from 'utils/zoot-plus-client'

export async function sendRegistrationEmail(req: { email: string }) {
  await new UserApi({ sendToken: 'never' }).sendRegistrationToken({
    sendRegistrationTokenDTO: req,
  })
}

export async function register(req: { email: string; registrationToken: string; username: string; password: string }) {
  await new UserApi({ sendToken: 'never' }).register({
    registerDTO: {
      ...req,
      userName: req.username,
    },
  })
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

export async function updatePassword(req: { originalPassword: string; newPassword: string }) {
  await new UserApi().updatePassword({ passwordUpdateDTO: req })
}

export async function sendResetPasswordEmail(req: { email: string }) {
  await new UserApi({ sendToken: 'never' }).passwordResetRequest({
    passwordResetVCodeDTO: req,
  })
}

export function resetPassword(req: { email: string; activeCode: string; password: string }) {
  return new UserApi({ sendToken: 'never' }).passwordReset({
    passwordResetDTO: req,
  })
}
