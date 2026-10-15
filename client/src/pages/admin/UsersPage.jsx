import { useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api } from '../../lib/api'
import { fieldError, focusFirstInvalid, summaryMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/format'
import { useApi } from '../../lib/useApi'
import { ConfirmDialog, Dialog, DialogActions } from '../../components/Dialog'
import { Alert, Button, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Sheet, TextField } from '../../components/ui'

const FILTERS = [
  ['', 'Everyone'],
  ['student', 'Students'],
  ['lecturer', 'Lecturers'],
  ['admin', 'Admins'],
]
const ROLES = [
  ['student', 'Student'],
  ['lecturer', 'Lecturer'],
  ['admin', 'Admin'],
]

// Admin only: create accounts, change roles, deactivate and reactivate
export function UsersPage() {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const { data, error, loading, reload } = useApi(role ? `/users?role=${role}` : '/users')
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState(null) // { user, changes, title, message }
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function applyChange() {
    setBusy(true)
    setActionError(null)
    try {
      await api(`/users/${confirming.user.id}`, { method: 'PATCH', body: confirming.changes })
      setConfirming(null)
      reload()
    } catch (err) {
      setActionError(err)
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }

  const askRoleChange = (user, newRole) =>
    setConfirming({
      user,
      changes: { role: newRole },
      title: `Make ${user.fullName} ${newRole === 'admin' ? 'an admin' : `a ${newRole}`}?`,
      message:
        newRole === 'admin'
          ? 'Admins can manage every user and course.'
          : `They will use CampusIQ as a ${newRole} from their next page load.`,
      confirmLabel: 'Change role',
    })

  const askActiveChange = (user) =>
    setConfirming({
      user,
      changes: { isActive: !user.isActive },
      title: user.isActive ? `Deactivate ${user.fullName}?` : `Reactivate ${user.fullName}?`,
      message: user.isActive
        ? 'They are logged out straight away and can no longer log in. Their results are kept.'
        : 'They will be able to log in again.',
      confirmLabel: user.isActive ? 'Deactivate' : 'Reactivate',
      tone: user.isActive ? 'danger' : 'primary',
    })

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users">
        <Button onClick={() => setAdding(true)}>+ Add user</Button>
      </PageHeader>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-md border border-rule bg-sheet p-1" role="group" aria-label="Filter by role">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            aria-pressed={role === value}
            className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
              role === value ? 'bg-ink text-sheet' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-6">
          <Alert>{actionError.message}</Alert>
        </div>
      )}

      {loading && <LoadingBlock label="Loading users…" />}
      {error && <ErrorBlock error={error} onRetry={reload} />}
      {data && data.users.length === 0 && <EmptyState title="No users here yet" />}

      {data && data.users.length > 0 && (
        <Sheet className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-bold">Name</th>
                <th className="px-3 py-3 font-bold">Role</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="hidden px-3 py-3 font-bold md:table-cell">Joined</th>
                <th className="px-5 py-3 text-right font-bold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {data.users.map((user) => {
                const isMe = user.id === me.id
                return (
                  <tr key={user.id} className={user.isActive ? '' : 'bg-paper/70'}>
                    <td className="px-5 py-3">
                      <p className={`font-semibold ${user.isActive ? 'text-ink' : 'text-ink-soft'}`}>
                        {user.fullName}
                        {isMe && <span className="ml-2 text-xs font-normal text-ink-soft">(you)</span>}
                      </p>
                      <p className="text-xs text-ink-soft">{user.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <label className="sr-only" htmlFor={`role-${user.id}`}>
                        Role for {user.fullName}
                      </label>
                      <select
                        id={`role-${user.id}`}
                        value={user.role}
                        disabled={isMe}
                        onChange={(e) => askRoleChange(user, e.target.value)}
                        className="rounded-md border border-rule bg-sheet px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-60"
                      >
                        {ROLES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${user.isActive ? 'text-pass' : 'text-marker'}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-pass' : 'bg-marker'}`} aria-hidden="true" />
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-ink-soft md:table-cell">{formatDateTime(user.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {!isMe && (
                        <Button
                          variant="ghost"
                          className={`px-3 py-1.5 ${user.isActive ? 'hover:text-marker' : ''}`}
                          onClick={() => askActiveChange(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Sheet>
      )}

      {adding && (
        <AddUserDialog
          defaultRole={role || 'student'}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            reload()
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.title}
          confirmLabel={confirming.confirmLabel}
          tone={confirming.tone}
          busy={busy}
          onCancel={() => setConfirming(null)}
          onConfirm={applyChange}
        >
          {confirming.message}
        </ConfirmDialog>
      )}
    </>
  )
}

const ADD_FIELDS = ['fullName', 'email', 'password', 'role']

function AddUserDialog({ defaultRole, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: defaultRole })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/users', { method: 'POST', body: form })
      onSaved()
    } catch (err) {
      setError(err)
      setBusy(false)
      focusFirstInvalid(formRef.current)
    }
  }

  return (
    <Dialog title="Add a user" onClose={onClose} busy={busy}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField label="Full name" name="fullName" value={form.fullName} onChange={update} error={fieldError(error, 'fullName')} autoFocus />
        <TextField label="Email" name="email" type="email" value={form.email} onChange={update} error={fieldError(error, 'email')} />
        <TextField
          label="Temporary password"
          name="password"
          type="text"
          autoComplete="off"
          value={form.password}
          onChange={update}
          hint="At least 8 characters. Share it with them privately."
          error={fieldError(error, 'password')}
        />
        <TextField as="select" label="Role" name="role" value={form.role} onChange={update} error={fieldError(error, 'role')}>
          {ROLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </TextField>
        <DialogActions busy={busy} submitLabel="Add user" onCancel={onClose} error={summaryMessage(error, ADD_FIELDS)} />
      </form>
    </Dialog>
  )
}
