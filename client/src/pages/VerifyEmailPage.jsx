import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { formatClock } from '../lib/format'
import { useNow } from '../lib/useNow'
import { AuthShell } from '../components/AuthShell'
import { CodeInput } from '../components/CodeInput'
import { Alert, Button } from '../components/ui'

const RESEND_WAIT_SECONDS = 60

// "s…@gmail.com": enough to recognise the address on a shared screen
function maskEmail(email) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(name.length - 1, 6)))}@${domain}`
}

export function VerifyEmailPage() {
  const { user, verifyEmail, resendCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  // A code was just sent, so the resend button waits a minute
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_WAIT_SECONDS * 1000)
  const [resending, setResending] = useState(false)
  const now = useNow(1000)

  if (user) return <Navigate to="/" replace />
  if (!email) return <Navigate to="/register" replace />

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  async function verify(submitted) {
    if (busy || submitted.length !== 6) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await verifyEmail(email, submitted)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err)
      setCode('')
      setBusy(false)
    }
  }

  async function resend() {
    setResending(true)
    setError(null)
    try {
      await resendCode(email)
      setNotice('We sent a new code. Check your inbox (and spam folder).')
      setResendAt(now + RESEND_WAIT_SECONDS * 1000)
      setCode('')
    } catch (err) {
      setError(err)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <b className="text-ink">{maskEmail(email)}</b>. Enter it below to finish creating
          your account.
        </>
      }
      footer={
        <>
          Wrong email?{' '}
          <Link to="/register" className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker">
            Sign up again
          </Link>{' '}
          ·{' '}
          <Link to="/login?as=student" className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker">
            Back to sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          verify(code)
        }}
        className="space-y-6"
        noValidate
      >
        {notice && <Alert tone="success">{notice}</Alert>}

        <CodeInput value={code} onChange={setCode} onComplete={verify} disabled={busy} invalid={Boolean(error)} />

        {error && <Alert>{error.details?.code?.[0] ?? error.message}</Alert>}

        <Button type="submit" className="w-full" busy={busy} disabled={code.length !== 6}>
          Verify email
        </Button>

        <p className="text-center text-sm text-ink-soft">
          Didn&apos;t get it? Check your spam folder, or{' '}
          {waitSeconds > 0 ? (
            <span>request a new code in {formatClock(waitSeconds)}</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker disabled:opacity-50"
            >
              {resending ? 'sending…' : 'send a new code'}
            </button>
          )}
          .
        </p>
      </form>
    </AuthShell>
  )
}
