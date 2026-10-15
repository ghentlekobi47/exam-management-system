import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/AuthShell'
import { PasswordField } from '../components/PasswordField'
import { Alert, Button, TextField } from '../components/ui'

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const fieldError = (name) => error?.details?.[name]?.[0]

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { email, emailSent } = await register(form)
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
        state: emailSent
          ? null
          : { notice: "Your account was created, but we couldn't send the email. Wait a minute, then send a new code." },
      })
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your student account"
      subtitle="Your lecturer will add you to your courses."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login?as=student" className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && !error.details && <Alert>{error.message}</Alert>}
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          onChange={update}
          error={fieldError('fullName')}
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update}
          error={fieldError('email')}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update}
          error={fieldError('password')}
          hint="At least 8 characters."
          required
        />
        <Button type="submit" className="w-full" busy={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
