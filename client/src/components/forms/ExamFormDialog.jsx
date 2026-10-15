import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, focusFirstInvalid, summaryMessage } from '../../lib/errors'
import { formatSpan, fromDateAndTime, toDateAndTime } from '../../lib/format'
import { Dialog, DialogActions } from '../Dialog'
import { Checkbox, TextField } from '../ui'

// Fields tucked away under "More options"
const MORE_FIELDS = ['instructions', 'maxAttempts', 'passMark']

// Same limits as the server
const TITLE_MAX = 200
const INSTRUCTIONS_MAX = 5000

const isWholeNumberBetween = (text, min, max) => {
  const value = Number(text)
  return text !== '' && Number.isInteger(value) && value >= min && value <= max
}

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
  const formRef = useRef(null)
  // When editing, show the extra settings straight away if any of them were changed
  const [showMore, setShowMore] = useState(
    () =>
      Boolean(exam) &&
      (Boolean(exam.instructions) || exam.maxAttempts !== 1 || exam.passMark !== 50 || exam.shuffleQuestions),
  )

  const update = (event) => {
    const { name, value, type, checked } = event.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const startAt = fromDateAndTime(form.startDate, form.startTime)
  const endAt = fromDateAndTime(form.endDate, form.endTime)
  const duration = Number(form.durationMinutes)

  async function handleSubmit(event) {
    event.preventDefault()

    // Catch common mistakes before sending, with messages next to the right fields
    const problems = {}
    if (form.title.trim().length < 2) problems.title = 'Give the exam a title (at least 2 characters)'
    if (form.title.trim().length > TITLE_MAX) {
      problems.title = `Keep the title under ${TITLE_MAX} characters (it has ${form.title.trim().length})`
    }
    if (form.instructions.trim().length > INSTRUCTIONS_MAX) {
      problems.instructions = `Instructions can be up to ${INSTRUCTIONS_MAX.toLocaleString()} characters (they have ${form.instructions.trim().length.toLocaleString()}). Put questions in the Questions section instead.`
    }
    if (!startAt) problems.startAt = 'Choose the opening date and time'
    if (!endAt) problems.endAt = 'Choose the closing date and time'
    if (startAt && endAt && endAt <= startAt) problems.endAt = 'The exam must close after it opens'
    if (!isWholeNumberBetween(form.durationMinutes, 1, 600)) {
      problems.durationMinutes = 'Enter a whole number of minutes from 1 to 600'
    }
    if (!isWholeNumberBetween(form.maxAttempts, 1, 10)) problems.maxAttempts = 'Enter a whole number from 1 to 10'
    if (form.passMark !== '' && !(Number(form.passMark) >= 0 && Number(form.passMark) <= 100)) {
      problems.passMark = 'Enter a percentage from 0 to 100, or leave it empty'
    }
    setLocalError(problems)
    if (Object.keys(problems).length > 0) {
      setError(null)
      focusFirstInvalid(formRef.current)
      return
    }

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
      focusFirstInvalid(formRef.current)
    }
  }

  // One message per field, whether the problem was found here or by the server
  const errorFor = (name) => localError[name] ?? fieldError(error, name)
  const startError = errorFor('startAt')
  const endError = errorFor('endAt')
  const windowMinutes = startAt && endAt && endAt > startAt ? (endAt - startAt) / 60000 : null

  // "More options" opens by itself when one of its fields has a problem
  const moreHasError = MORE_FIELDS.some((name) => errorFor(name))
  const moreOpen = showMore || moreHasError

  return (
    <Dialog title={exam ? 'Edit exam details' : 'New exam'} onClose={onClose} busy={busy} wide>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          label="Title"
          name="title"
          value={form.title}
          onChange={update}
          placeholder="Mid-semester quiz"
          error={errorFor('title')}
          autoFocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <TextField
            label="Time allowed (minutes)"
            name="durationMinutes"
            type="number"
            min="1"
            max="600"
            value={form.durationMinutes}
            onChange={update}
            error={errorFor('durationMinutes')}
            className="w-44"
          />
          {windowMinutes !== null && duration > 0 && (
            <p className="pb-3 text-sm text-ink-soft" aria-live="polite">
              Open for {formatSpan(windowMinutes)} · {formatSpan(duration)} per student
            </p>
          )}
        </div>

        <div className="border-t border-rule pt-4">
          <button
            type="button"
            onClick={() => setShowMore(!moreOpen)}
            aria-expanded={moreOpen}
            aria-controls="exam-more-options"
            className="flex w-full items-center justify-between rounded-md text-left text-sm font-semibold text-ink hover:text-ink/80"
          >
            <span>
              More options <span className="font-normal text-ink-soft">(instructions, attempts, pass mark)</span>
            </span>
            <span aria-hidden="true" className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {moreOpen && (
            <div id="exam-more-options" className="mt-4 space-y-4">
              <TextField
                as="textarea"
                label="Instructions for students (optional)"
                name="instructions"
                rows={2}
                value={form.instructions}
                onChange={update}
                placeholder="Answer all questions. Calculators are not allowed."
                error={errorFor('instructions')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Attempts allowed"
                  name="maxAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxAttempts}
                  onChange={update}
                  error={errorFor('maxAttempts')}
                />
                <TextField
                  label="Pass mark (%)"
                  name="passMark"
                  type="number"
                  min="0"
                  max="100"
                  value={form.passMark}
                  onChange={update}
                  placeholder="None"
                  error={errorFor('passMark')}
                />
              </div>
              <Checkbox
                label="Shuffle questions"
                hint="Each student gets the questions in a different order."
                name="shuffleQuestions"
                checked={form.shuffleQuestions}
                onChange={update}
              />
            </div>
          )}
        </div>

        <DialogActions
          busy={busy}
          submitLabel={exam ? 'Save changes' : 'Create exam'}
          onCancel={onClose}
          error={summaryMessage(error, FIELDS, Object.keys(localError).length > 0)}
        />
      </form>
    </Dialog>
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
      <div className="grid grid-cols-[1fr_7.5rem] gap-2" role="group" aria-labelledby={`${prefix}-schedule-label`}>
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
