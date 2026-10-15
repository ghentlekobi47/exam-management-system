import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, focusFirstInvalid, summaryMessage } from '../../lib/errors'
import { useApi } from '../../lib/useApi'
import { Dialog, DialogActions } from '../Dialog'
import { Alert, Spinner, TextField } from '../ui'

const FIELDS = ['code', 'title', 'description', 'lecturerId']

// Create a course, or edit one when `course` is given (admin only)
export function CourseFormDialog({ course, onClose, onSaved }) {
  const lecturers = useApi('/users?role=lecturer')
  const [form, setForm] = useState({
    code: course?.code ?? '',
    title: course?.title ?? '',
    description: course?.description ?? '',
    lecturerId: course?.lecturerId ? String(course.lecturerId) : '',
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const activeLecturers = lecturers.data?.users.filter((u) => u.isActive || u.id === course?.lecturerId) ?? []

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = {
        code: form.code,
        title: form.title,
        description: form.description.trim() || null,
        lecturerId: Number(form.lecturerId) || undefined,
      }
      const result = course
        ? await api(`/courses/${course.id}`, { method: 'PATCH', body })
        : await api('/courses', { method: 'POST', body })
      onSaved(result.course)
    } catch (err) {
      setError(err)
      setBusy(false)
      focusFirstInvalid(formRef.current)
    }
  }

  return (
    <Dialog title={course ? 'Edit course' : 'New course'} onClose={onClose} busy={busy}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>

        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <TextField
            label="Code"
            name="code"
            value={form.code}
            onChange={update}
            placeholder="CS101"
            error={fieldError(error, 'code')}
            autoFocus
          />
          <TextField
            label="Title"
            name="title"
            value={form.title}
            onChange={update}
            placeholder="Introduction to Computing"
            error={fieldError(error, 'title')}
          />
        </div>

        <TextField
          as="textarea"
          label="Description (optional)"
          name="description"
          rows={3}
          value={form.description}
          onChange={update}
          error={fieldError(error, 'description')}
        />

        {lecturers.loading ? (
          <Spinner small label="Loading lecturers…" />
        ) : activeLecturers.length === 0 ? (
          <Alert tone="info">There are no active lecturers yet. Add one on the Users page first.</Alert>
        ) : (
          <TextField
            as="select"
            label="Lecturer"
            name="lecturerId"
            value={form.lecturerId}
            onChange={update}
            error={fieldError(error, 'lecturerId') && (form.lecturerId ? fieldError(error, 'lecturerId') : 'Choose a lecturer')}
          >
            <option value="">Choose a lecturer…</option>
            {activeLecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.fullName} ({lecturer.email})
              </option>
            ))}
          </TextField>
        )}

        <DialogActions
          busy={busy}
          submitLabel={course ? 'Save changes' : 'Create course'}
          onCancel={onClose}
          error={summaryMessage(error, FIELDS)}
        />
      </form>
    </Dialog>
  )
}
