import { refreshAccessToken } from 'apis/auth'
import { getDefaultStore } from 'jotai'
import { noop } from 'lodash-es'

import { authAtom, fromCredentials } from 'store/auth'
import { InvalidTokenError, NetworkError, TokenExpiredError, UnauthorizedError } from 'utils/error'

let store = getDefaultStore()
let pendingGetToken: Promise<string> | undefined

export const TokenManager = {
  setStore(newStore: typeof store) {
    store = newStore
  },
  updateAndGetToken() {
    if (pendingGetToken) {
      return pendingGetToken
    }

    const { token, validBefore, refreshToken, refreshTokenValidBefore } = store.get(authAtom)

    const endTime = +new Date(validBefore || 0) || 0
    const refreshEndTime = +new Date(refreshTokenValidBefore || 0) || 0

    pendingGetToken = (async () => {
      if (!token) {
        throw new UnauthorizedError()
      }

      const now = Date.now()

      if (endTime > now) {
        return token
      }

      if (!refreshToken) {
        store.set(authAtom, {})
        throw new InvalidTokenError()
      }

      if (refreshEndTime > now) {
        try {
          const res = await refreshAccessToken({ refreshToken })

          store.set(authAtom, fromCredentials(res))

          return res.token
        } catch (e) {
          if (e instanceof NetworkError) {
            throw e
          }
          throw new TokenExpiredError()
        }
      } else {
        store.set(authAtom, {})
        throw new InvalidTokenError()
      }
    })()

    // reset when finished, so that the next call will trigger a new check
    pendingGetToken
      .finally(() => {
        pendingGetToken = undefined
      })
      // we still need to catch the error here, otherwise it will be unhandled
      .catch(noop)

    return pendingGetToken
  },
}
