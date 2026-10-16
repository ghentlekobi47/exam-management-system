import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { fieldError } from '../lib/errors'
import { formatDate, initials, roleLabels } from '../lib/format'
import { PasswordField } from '../components/PasswordField'
import { Alert, Button, PageHeader, Sheet, TextField } from '../components/ui'

// The signed-in user's own account: details, name and password
export function ProfilePage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader eyebrow="Your account" title="My profile" />

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <Sheet className="h-fit px-6 py-8 text-center">
          <span
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink text-2xl font-semibold text-sheet"
            aria-hidden="true"
          >
            {initials(user.fullName)}
          </span>
          <p className="mt-4 text-xl font-semibold text-ink">{user.fullName}</p>
          <p className="break-all text-sm text-ink-soft">{user.email}</p>
          <span className="mt-3 inline-block rounded bg-ink/5 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
            {roleLabels[user.role]}
          </span>

          <dl className="mt-6 space-y-2 border-t border-rule pt-5 text-left text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Member since</dt>
              <dd className="font-semibold text-ink">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Email</dt>
              <dd className={`font-semibold ${user.emailVerifiedAt ? 'text-pass' : 'text-marker'}`}>
                {user.emailVerifiedAt ? '✓ Verified' : 'Not verified'}
              </dd>
            </div>
          </dl>

          {user.role === 'student' && (
            <Link
              to="/results"
              className="mt-6 inline-block text-sm font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker"
            >
              See my results →
            </Link>
          )}
        </Sheet>

        <div className="space-y-8">
          <DetailsForm />
          <PasswordForm />
        </div>
      </div>
    </>
  )
}

function DetailsForm() {
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState(user.fullName)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const unchanged = fullName.trim() === user.fullName

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const { user: updated } = await api('/auth/me', { method: 'PATCH', body: { fullName } })
      updateUser(updated)
      setFullName(updated.fullName)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet className="px-6 py-6">
      <h2 className="text-xl font-semibold">Your details</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            setSaved(false)
          }}
          error={fieldError(error, 'fullName')}
        />
        <TextField
          label="Email"
          name="email"
          value={user.email}
          disabled
          hint="Your email is how you sign in. Ask an admin if it needs to change."
        />
        {error && !fieldError(error, 'fullName') && <Alert>{error.message}</Alert>}
        {saved && <Alert tone="success">Your name was updated.</Alert>}
        <div className="flex justify-end">
          <Button type="submit" busy={busy} disabled={unchanged}>
            Save changes
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' }

function PasswordForm() {
  const { replaceSession } = useAuth()
  const [form, setForm] = useState(EMPTY_PASSWORDS)
  const [error, setError] = useState(null)
  const [mismatch, setMismatch] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setSaved(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaved(false)
    setError(null)

    // Catch a typo in the new password before sending
    if (form.newPassword !== form.confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)

    setBusy(true)
    try {
      const { token, user } = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      })
      // Other devices are now signed out; keep this one signed in with the fresh token
      replaceSession(token, user)
      setForm(EMPTY_PASSWORDS)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const generalError = error && !fieldError(error, 'currentPassword') && !fieldError(error, 'newPassword')

  return (
    <Sheet className="px-6 py-6">
      <h2 className="text-xl font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-ink-soft">
        If an admin gave you a temporary password, replace it with one only you know.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={update}
          error={fieldError(error, 'currentPassword')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordField
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={update}
            hint="At least 8 characters."
            error={fieldError(error, 'newPassword')}
          />
          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update}
            error={mismatch ? "This doesn't match the new password" : undefined}
          />
        </div>
        {generalError && <Alert>{error.message}</Alert>}
        {saved && (
          <Alert tone="success">
            Your password was changed. You stay signed in here; any other devices have been signed out.
          </Alert>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            busy={busy}
            disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}
          >
            Change password
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
