import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/AuthShell'
import { PasswordField } from '../components/PasswordField'
import { Alert, Button, TextField } from '../components/ui'

const TAB_KEY = 'campusiq.loginTab'

const TABS = [
  {
    role: 'student',
    label: 'Student',
    title: 'Student sign in',
    subtitle: 'See your courses, take exams and check your results.',
    icon: (
      <path d="M12 4L2 9l10 5 10-5-10-5zM6 11.2V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
  },
  {
    role: 'lecturer',
    label: 'Lecturer',
    title: 'Lecturer sign in',
    subtitle: 'Create exams, enroll students and see how your classes did.',
    icon: (
      <path d="M3 4h18v11H3zM8 20l4-5 4 5M7 8h6M7 11h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    role: 'admin',
    label: 'Admin',
    title: 'Admin sign in',
    subtitle: 'Manage users, courses and lecturers across CampusIQ.',
    icon: (
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
]

const isRole = (value) => TABS.some((tab) => tab.role === value)

function readStoredTab() {
  try {
    const stored = localStorage.getItem(TAB_KEY)
    return isRole(stored) ? stored : 'student'
  } catch {
    return 'student'
  }
}

function storeTab(role) {
  try {
    localStorage.setItem(TAB_KEY, role)
  } catch {
    // The tab just won't be remembered next time
  }
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [storedTab] = useState(readStoredTab)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const tabRefs = useRef({})

  // ?as=lecturer in the address opens that tab; otherwise the last one used
  const requested = searchParams.get('as')
  const role = isRole(requested) ? requested : storedTab
  const tab = TABS.find((t) => t.role === role)

  const goTo = location.state?.from ?? '/'
  if (user) return <Navigate to={goTo} replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  function selectTab(nextRole, { focus = false } = {}) {
    storeTab(nextRole)
    setError(null)
    setSearchParams({ as: nextRole }, { replace: true, state: location.state })
    if (focus) tabRefs.current[nextRole]?.focus()
  }

  // Left/right arrows (and Home/End) move between tabs, as screen reader users expect
  function onTabKeyDown(event) {
    const index = TABS.findIndex((t) => t.role === role)
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = TABS[(moves[event.key] + TABS.length) % TABS.length]
    selectTab(next.role, { focus: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(form.email, form.password, role)
      storeTab(role)
      navigate(goTo, { replace: true })
    } catch (err) {
      // Right password, but the email isn't verified yet: go and enter the code
      if (err.details?.reason === 'email_not_verified') {
        navigate(`/verify-email?email=${encodeURIComponent(err.details.email)}`, {
          state: { notice: 'Please verify your email first. We sent a code to your inbox.' },
        })
        return
      }
      setError(err)
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={tab.title}
      subtitle={tab.subtitle}
      footer={
        role === 'student' ? (
          <>
            New student?{' '}
            <Link
              to="/register"
              className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>{tab.label} accounts are created by your CampusIQ admin. Ask them if you can't sign in.</>
        )
      }
      beforeTitle={
        <div
          role="tablist"
          aria-label="Sign in as"
          className="mb-8 grid grid-cols-3 gap-1 rounded-lg border border-rule bg-paper p-1"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => {
            const selected = t.role === role
            return (
              <button
                key={t.role}
                ref={(el) => {
                  tabRefs.current[t.role] = el
                }}
                type="button"
                role="tab"
                id={`login-tab-${t.role}`}
                aria-selected={selected}
                aria-controls="login-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(t.role)}
                className={`flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-sm font-semibold transition-colors sm:flex-row sm:justify-center sm:gap-2 ${
                  selected ? 'bg-ink text-sheet shadow-sm' : 'text-ink-soft hover:bg-sheet hover:text-ink'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  {t.icon}
                </svg>
                {t.label}
              </button>
            )
          })}
        </div>
      }
    >
      <form
        id="login-panel"
        role="tabpanel"
        aria-labelledby={`login-tab-${role}`}
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        {error && <Alert>{error.message}</Alert>}
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update}
          error={error?.details?.email?.[0]}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update}
          error={error?.details?.password?.[0]}
          required
        />
        <Button type="submit" className="w-full" busy={busy}>
          Sign in as {tab.label.toLowerCase()}
        </Button>
      </form>
    </AuthShell>
  )
}
