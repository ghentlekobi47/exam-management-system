import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setAuthToken, setUnauthorizedHandler } from '../lib/api'
import { AuthContext } from './AuthContext'

const TOKEN_KEY = 'campusiq.token'

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be blocked (e.g. private mode); the session then lasts until refresh
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = readStoredToken()
    setAuthToken(stored)
    return stored
  })
  const [user, setUser] = useState(null)
  // While a saved token is being checked we don't know yet who is logged in
  const [status, setStatus] = useState(() => (token ? 'checking' : 'ready'))

  const applySession = useCallback((nextToken, nextUser) => {
    setAuthToken(nextToken)
    storeToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setStatus('ready')
  }, [])

  const logout = useCallback(() => applySession(null, null), [applySession])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // On page load, check the saved token is still valid
  useEffect(() => {
    if (!token || user) return

    let ignore = false
    api('/auth/me')
      .then(({ user: me }) => {
        if (!ignore) applySession(token, me)
      })
      .catch(() => {
        if (!ignore) applySession(null, null)
      })

    return () => {
      ignore = true
    }
  }, [token, user, applySession])

  const login = useCallback(
    // `role` is the login page tab; the server says which tab to use if it doesn't match
    async (email, password, role) => {
      setAuthToken(null)
      const result = await api('/auth/login', { method: 'POST', body: { email, password, role } })
      applySession(result.token, result.user)
      return result.user
    },
    [applySession],
  )

  // Creates the account and emails a code; signing in happens in verifyEmail
  const register = useCallback(async (fields) => {
    setAuthToken(null)
    return api('/auth/register', { method: 'POST', body: fields })
  }, [])

  const verifyEmail = useCallback(
    async (email, code) => {
      setAuthToken(null)
      const result = await api('/auth/verify-email', { method: 'POST', body: { email, code } })
      applySession(result.token, result.user)
      return result.user
    },
    [applySession],
  )

  const resendCode = useCallback((email) => api('/auth/resend-code', { method: 'POST', body: { email } }), [])

  const value = useMemo(
    () => ({ user, status, login, register, verifyEmail, resendCode, logout }),
    [user, status, login, register, verifyEmail, resendCode, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
