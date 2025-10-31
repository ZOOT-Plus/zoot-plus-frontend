import { atomWithStorage } from 'jotai/utils'
import { MaaLoginRsp } from 'maa-copilot-client'

export interface AuthState {
  token?: string
  validBefore?: string
  refreshToken?: string
  refreshTokenValidBefore?: string

  activated?: boolean
  role?: string
  roles?: string[]
  userId?: string
  username?: string
}

export const authAtom = atomWithStorage<AuthState>('maa-copilot-auth', {})

export function fromCredentials(credentials: MaaLoginRsp): AuthState {
  // 尝试从返回体与 JWT 中解析权限（后端将 GrantedAuthority 集合编码到 JWT 的 "Authorities" 声明，逗号分隔，如："0,1,2"）
  const decodeJwt = (token?: string): any | undefined => {
    try {
      if (!token) return undefined
      const seg = token.split('.')?.[1]
      if (!seg) return undefined
      // base64url 解码
      const json = atob(seg.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(json)
    } catch {
      return undefined
    }
  }

  const ui: any = (credentials as any).userInfo ?? {}
  const jwt = decodeJwt(credentials.token)
  // 优先从 JWT 的 Authorities 解析；其次兼容 ui.roles / jwt.roles
  const authoritiesRaw: string | undefined =
    (typeof jwt?.Authorities === 'string' && jwt.Authorities) ||
    (typeof jwt?.authorities === 'string' && jwt.authorities) ||
    undefined
  const rolesFromAuthorities = authoritiesRaw
    ?.split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const roles: string[] | undefined =
    rolesFromAuthorities ??
    ui.roles ??
    (Array.isArray(jwt?.roles) ? jwt.roles : undefined)

  const role: string | undefined =
    (roles && roles[0]) ||
    ui.role ||
    (Array.isArray(ui.roles) ? ui.roles[0] : undefined) ||
    jwt?.role ||
    (Array.isArray(jwt?.roles) ? jwt.roles[0] : undefined)

  return {
    token: credentials.token,
    validBefore: credentials.validBefore.toISOString(),
    refreshToken: credentials.refreshToken,
    refreshTokenValidBefore: credentials.refreshTokenValidBefore.toISOString(),
    activated: credentials.userInfo.activated,
    role,
    roles,
    userId: credentials.userInfo.id,
    username: credentials.userInfo.userName,
  }
}

export function isAdmin(auth?: AuthState): boolean {
  const roles = auth?.roles ?? (auth?.role ? [auth.role] : [])
  if (!roles || roles.length === 0) return false
  // 后端 UserDetailServiceImpl 使用 0..status 作为 GrantedAuthority；ADMIN_STATUS = 2
  const hasNumericAdmin = roles
    .map((r) => parseInt(String(r), 10))
    .some((n) => !Number.isNaN(n) && n >= 2)
  if (hasNumericAdmin) return true
  // 兼容潜在字符串角色
  const upper = roles.map((r) => String(r).toUpperCase())
  return upper.includes('ADMIN') || upper.includes('ROLE_ADMIN')
}
