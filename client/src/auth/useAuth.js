import { useContext } from 'react'
import { AuthContext } from './AuthContext'

// { user, status, login, register, logout }; status is 'checking' or 'ready'
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
