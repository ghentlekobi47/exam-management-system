import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { LoadingBlock } from './ui'

// Only shows its pages to logged-in users (and, with `roles`, only those roles).
// Others go to the login page, or home if they're logged in with the wrong role.
export function ProtectedRoute({ roles }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <LoadingBlock label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
