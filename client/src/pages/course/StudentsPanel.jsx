import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError } from '../../lib/errors'
import { useApi } from '../../lib/useApi'
import { ConfirmDialog } from '../../components/Dialog'
import { Alert, Button, EmptyState, ErrorBlock, Sheet, Spinner } from '../../components/ui'

// Enrolled students, with enroll-by-email and remove (admin or the course's lecturer)
export function StudentsPanel({ courseId }) {
  const { data, error, loading, reload } = useApi(`/courses/${courseId}/students`)
  const [email, setEmail] = useState('')
  const [enrollError, setEnrollError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  async function enroll(event) {
    event.preventDefault()
    setBusy(true)
    setEnrollError(null)
    setNotice(null)
    try {
      const { student } = await api(`/courses/${courseId}/students`, { method: 'POST', body: { email } })
      setNotice(`${student.fullName} is now enrolled.`)
      setEmail('')
      reload()
    } catch (err) {
      setEnrollError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setRemoveBusy(true)
    try {
      await api(`/courses/${courseId}/students/${removing.id}`, { method: 'DELETE' })
      setNotice(`${removing.fullName} was removed from the course.`)
      setRemoving(null)
      reload()
    } catch (err) {
      setEnrollError(err)
      setRemoving(null)
    } finally {
      setRemoveBusy(false)
    }
  }

  const students = data?.students ?? []

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Students</h2>
        {data && <span className="text-sm text-ink-soft">{students.length} enrolled</span>}
      </div>

      <Sheet>
        <form onSubmit={enroll} className="flex flex-col gap-3 border-b border-rule p-5 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="enroll-email" className="sr-only">
              Student email
            </label>
            <input
              id="enroll-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@email.com"
              className={`block w-full rounded-md border bg-sheet px-3 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 ${
                fieldError(enrollError, 'email') ? 'border-marker' : 'border-rule'
              }`}
            />
          </div>
          <Button type="submit" busy={busy} disabled={!email.trim()}>
            Enroll student
          </Button>
        </form>

        <div className="space-y-3 px-5 pt-4 empty:hidden">
          {enrollError && <Alert>{fieldError(enrollError, 'email') ?? enrollError.message}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
        </div>

        {loading && (
          <div className="p-5">
            <Spinner small label="Loading students…" />
          </div>
        )}
        {error && (
          <div className="px-5">
            <ErrorBlock error={error} onRetry={reload} />
          </div>
        )}

        {data && students.length === 0 && (
          <div className="p-5">
            <EmptyState title="No students yet">Enroll students by their account email above.</EmptyState>
          </div>
        )}

        {students.length > 0 && (
          <ul className="divide-y divide-rule">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {student.fullName}
                    {!student.isActive && <span className="ml-2 text-xs font-normal text-marker">(deactivated)</span>}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{student.email}</p>
                </div>
                <Button variant="ghost" className="shrink-0 hover:text-marker" onClick={() => setRemoving(student)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {removing && (
        <ConfirmDialog
          title="Remove student?"
          confirmLabel="Remove"
          tone="danger"
          busy={removeBusy}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
        >
          {removing.fullName} will no longer see this course or its exams. Their past results are kept.
        </ConfirmDialog>
      )}
    </section>
  )
}
