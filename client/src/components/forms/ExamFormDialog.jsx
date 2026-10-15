import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, formError } from '../../lib/errors'
import { formatDateTime, formatSpan, fromDateAndTime, toDateAndTime } from '../../lib/format'
import { Dialog, DialogActions } from '../Dialog'
import { Alert, Checkbox, TextField } from '../ui'

const FIELDS = ['title', 'instructions', 'durationMinutes', 'startAt', 'endAt', 'maxAttempts', 'passMark']
const HOUR = 60 * 60 * 1000
const WEEK = 7 * 24 * HOUR

function initialForm(exam) {
  if (exam) {
    const opens = toDateAndTime(exam.startAt)
    const closes = toDateAndTime(exam.endAt)
    return {
      title: exam.title,
      instructions: exam.instructions ?? '',
      startDate: opens.date,
      startTime: opens.time,
      endDate: closes.date,
      endTime: closes.time,
      durationMinutes: String(exam.durationMinutes),
      maxAttempts: String(exam.maxAttempts),
      passMark: exam.passMark === null ? '' : String(exam.passMark),
      shuffleQuestions: exam.shuffleQuestions,
    }
  }

  // A new exam opens at the next full hour and stays open for a week
  const nextHour = Math.ceil(Date.now() / HOUR) * HOUR
  const opens = toDateAndTime(nextHour)
  const closes = toDateAndTime(nextHour + WEEK)
  return {
    title: '',
    instructions: '',
    startDate: opens.date,
    startTime: opens.time,
    endDate: closes.date,
    endTime: closes.time,
    durationMinutes: '30',
    maxAttempts: '1',
    passMark: '50',
    shuffleQuestions: false,
  }
}

// Create an exam for a course, or edit a draft exam's details
export function ExamFormDialog({ courseId, exam, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(exam))
  const [error, setError] = useState(null)
  const [localError, setLocalError] = useState({})
  const [busy, setBusy] = useState(false)

  const update = (event) => {
    const { name, value, type, checked } = event.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const startAt = fromDateAndTime(form.startDate, form.startTime)
  const endAt = fromDateAndTime(form.endDate, form.endTime)
  const duration = Number(form.durationMinutes)

  async function handleSubmit(event) {
    event.preventDefault()

    // Catch schedule mistakes before sending, with messages next to the right fields
    const problems = {}
    if (!startAt) problems.startAt = 'Choose the opening date and time'
    if (!endAt) problems.endAt = 'Choose the closing date and time'
    if (startAt && endAt && endAt <= startAt) problems.endAt = 'The exam must close after it opens'
    setLocalError(problems)
    if (Object.keys(problems).length > 0) return

    setBusy(true)
    setError(null)
    try {
      const body = {
        title: form.title,
        instructions: form.instructions.trim() || null,
        durationMinutes: duration,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        maxAttempts: Number(form.maxAttempts),
        passMark: form.passMark === '' ? null : Number(form.passMark),
        shuffleQuestions: form.shuffleQuestions,
      }
      const result = exam
        ? await api(`/exams/${exam.id}`, { method: 'PATCH', body })
        : await api(`/courses/${courseId}/exams`, { method: 'POST', body })
      onSaved(result.exam)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const startError = localError.startAt ?? fieldError(error, 'startAt')
  const endError = localError.endAt ?? fieldError(error, 'endAt')
  const windowMinutes = startAt && endAt && endAt > startAt ? (endAt - startAt) / 60000 : null

  return (
    <Dialog title={exam ? 'Edit exam details' : 'New exam'} onClose={onClose} busy={busy} wide>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {formError(error, FIELDS) && <Alert>{formError(error, FIELDS)}</Alert>}

        <Section title="About the exam">
          <TextField
            label="Title"
            name="title"
            value={form.title}
            onChange={update}
            placeholder="Mid-semester quiz"
            error={fieldError(error, 'title')}
            autoFocus
          />
          <TextField
            as="textarea"
            label="Instructions for students (optional)"
            name="instructions"
            rows={3}
            value={form.instructions}
            onChange={update}
            placeholder="Answer all questions. Calculators are not allowed."
            error={fieldError(error, 'instructions')}
          />
        </Section>

        <Section title="Schedule" description="When students can start the exam, and how long each student gets once they start.">
          <DateTimeRow
            label="Opens"
            prefix="start"
            date={form.startDate}
            time={form.startTime}
            onChange={update}
            error={startError}
          />
          <DateTimeRow
            label="Closes"
            prefix="end"
            date={form.endDate}
            time={form.endTime}
            onChange={update}
            error={endError}
          />
          <TextField
            label="Time allowed per student (minutes)"
            name="durationMinutes"
            type="number"
            min="1"
            max="600"
            value={form.durationMinutes}
            onChange={update}
            error={fieldError(error, 'durationMinutes')}
            className="sm:max-w-xs"
          />

          {windowMinutes !== null && duration > 0 && (
            <p className="rounded-md bg-paper px-4 py-3 text-sm text-ink" aria-live="polite">
              Students can start any time from <b>{formatDateTime(startAt)}</b> to <b>{formatDateTime(endAt)}</b>{' '}
              (open for {formatSpan(windowMinutes)}). Each student gets <b>{formatSpan(duration)}</b>
              {duration > windowMinutes
                ? ', but no one can go past the closing time.'
                : ', ending early if the exam closes first.'}
            </p>
          )}
        </Section>

        <Section title="Marking and attempts">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Attempts allowed"
              name="maxAttempts"
              type="number"
              min="1"
              max="10"
              value={form.maxAttempts}
              onChange={update}
              error={fieldError(error, 'maxAttempts')}
            />
            <TextField
              label="Pass mark (%)"
              name="passMark"
              type="number"
              min="0"
              max="100"
              value={form.passMark}
              onChange={update}
              hint="Leave empty for no pass mark."
              error={fieldError(error, 'passMark')}
            />
          </div>
          <Checkbox
            label="Shuffle questions"
            hint="Each student gets the questions in a different order."
            name="shuffleQuestions"
            checked={form.shuffleQuestions}
            onChange={update}
          />
        </Section>

        <DialogActions busy={busy} submitLabel={exam ? 'Save changes' : 'Create exam'} onCancel={onClose} />
      </form>
    </Dialog>
  )
}

function Section({ title, description, children }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-rule p-5">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">{title}</legend>
      {description && <p className="-mt-1 text-sm text-ink-soft">{description}</p>}
      {children}
    </fieldset>
  )
}

// A label with a date picker and a time picker side by side
function DateTimeRow({ label, prefix, date, time, onChange, error }) {
  const errorId = `${prefix}-schedule-error`

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-ink" id={`${prefix}-schedule-label`}>
        {label}
      </p>
      <div className="grid grid-cols-[1fr_8.5rem] gap-3" role="group" aria-labelledby={`${prefix}-schedule-label`}>
        <div>
          <label htmlFor={`${prefix}Date`} className="sr-only">
            {label} date
          </label>
          <input
            id={`${prefix}Date`}
            name={`${prefix}Date`}
            type="date"
            value={date}
            onChange={onChange}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`block w-full rounded-md border bg-sheet px-3 py-2.5 text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 ${
              error ? 'border-marker' : 'border-rule'
            }`}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}Time`} className="sr-only">
            {label} time
          </label>
          <input
            id={`${prefix}Time`}
            name={`${prefix}Time`}
            type="time"
            value={time}
            onChange={onChange}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`block w-full rounded-md border bg-sheet px-3 py-2.5 text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 ${
              error ? 'border-marker' : 'border-rule'
            }`}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-marker">
          {error}
        </p>
      )}
    </div>
  )
}
