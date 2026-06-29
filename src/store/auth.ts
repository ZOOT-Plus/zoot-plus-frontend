import { atomWithStorage } from 'jotai/utils'
import { MaaLoginRsp } from 'maa-copilot-client'

export interface AuthState {
  token?: string
  validBefore?: string
  refreshToken?: string
  refreshTokenValidBefore?: string

  activated?: boolean
  role?: string
  userId?: string
  username?: string
}

export const authAtom = atomWithStorage<AuthState>('maa-copilot-auth', {}, undefined, {
  getOnInit: true,
})

export function fromCredentials(credentials: MaaLoginRsp): AuthState {
  return {
    token: credentials.token,
    validBefore: credentials.validBefore.toISOString(),
    refreshToken: credentials.refreshToken,
    refreshTokenValidBefore: credentials.refreshTokenValidBefore.toISOString(),
    activated: credentials.userInfo.activated,
    userId: credentials.userInfo.id,
    username: credentials.userInfo.userName,
  }
}
