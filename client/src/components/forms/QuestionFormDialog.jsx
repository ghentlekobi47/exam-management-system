import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, focusFirstInvalid, summaryMessage } from '../../lib/errors'
import { Dialog, DialogActions } from '../Dialog'
import { Button, TextField } from '../ui'

const FIELDS = ['text', 'points', 'options', 'correctAnswer']
const MIN_OPTIONS = 2
const MAX_OPTIONS = 6

function initialForm(question) {
  if (!question) {
    return {
      type: 'multiple_choice',
      text: '',
      points: '1',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswer: true,
    }
  }

  return {
    type: question.type,
    text: question.text,
    points: String(question.points),
    options:
      question.type === 'multiple_choice'
        ? question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
        : [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
          ],
    correctAnswer: question.options.find((o) => o.text === 'True')?.isCorrect ?? true,
  }
}

// Add a question to a draft exam, or edit one when `question` is given
export function QuestionFormDialog({ examId, question, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(question))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const setOptionText = (index, text) =>
    setField(
      'options',
      form.options.map((o, i) => (i === index ? { ...o, text } : o)),
    )

  const markCorrect = (index) =>
    setField(
      'options',
      form.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    )

  const addOption = () => setField('options', [...form.options, { text: '', isCorrect: false }])

  const removeOption = (index) => {
    const remaining = form.options.filter((_, i) => i !== index)
    // Keep exactly one correct option
    if (!remaining.some((o) => o.isCorrect)) remaining[0] = { ...remaining[0], isCorrect: true }
    setField('options', remaining)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const body =
      form.type === 'true_false'
        ? { type: 'true_false', text: form.text, points: Number(form.points), correctAnswer: form.correctAnswer }
        : { type: 'multiple_choice', text: form.text, points: Number(form.points), options: form.options }

    try {
      const result = question
        ? await api(`/exams/${examId}/questions/${question.id}`, { method: 'PUT', body })
        : await api(`/exams/${examId}/questions`, { method: 'POST', body })
      onSaved(result.question)
    } catch (err) {
      setError(err)
      setBusy(false)
      focusFirstInvalid(formRef.current)
    }
  }

  return (
    <Dialog title={question ? 'Edit question' : 'Add a question'} onClose={onClose} busy={busy} wide>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Question type</legend>
          <div className="inline-flex rounded-md border border-rule bg-paper p-1">
            {[
              ['multiple_choice', 'Multiple choice'],
              ['true_false', 'True / False'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                  form.type === value ? 'bg-ink text-sheet shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={value}
                  checked={form.type === value}
                  onChange={() => setField('type', value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
          <TextField
            as="textarea"
            label="Question"
            name="text"
            rows={2}
            value={form.text}
            onChange={(e) => setField('text', e.target.value)}
            placeholder={form.type === 'true_false' ? 'The CPU is the brain of the computer.' : 'Which of these is an input device?'}
            error={fieldError(error, 'text')}
            autoFocus
          />
          <TextField
            label="Points"
            name="points"
            type="number"
            min="0.5"
            max="100"
            step="0.5"
            value={form.points}
            onChange={(e) => setField('points', e.target.value)}
            error={fieldError(error, 'points')}
          />
        </div>

        {form.type === 'true_false' ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Correct answer</legend>
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((value) => (
                <AnswerChoice
                  key={String(value)}
                  name="correctAnswer"
                  checked={form.correctAnswer === value}
                  onChange={() => setField('correctAnswer', value)}
                >
                  {value ? 'True' : 'False'}
                </AnswerChoice>
              ))}
            </div>
          </fieldset>
        ) : (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-ink">Options</legend>
            <p className="mb-3 text-sm text-ink-soft">Tick the one correct answer.</p>
            <ul className="space-y-2">
              {form.options.map((option, index) => (
                <li key={index} className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2" title="Mark as the correct answer">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={option.isCorrect}
                      onChange={() => markCorrect(index)}
                      className="h-4 w-4 accent-pass"
                    />
                    <span className="sr-only">Option {index + 1} is correct</span>
                  </label>
                  <input
                    aria-label={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) => setOptionText(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className={`block w-full rounded-md border bg-sheet px-3 py-2 text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 ${
                      option.isCorrect ? 'border-pass/60 bg-pass/5' : 'border-rule'
                    }`}
                  />
                  {option.isCorrect && (
                    <span className="hidden shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-pass sm:inline">
                      Correct
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= MIN_OPTIONS}
                    className="shrink-0 rounded p-1.5 text-ink-soft hover:bg-paper hover:text-marker disabled:invisible"
                    aria-label={`Remove option ${index + 1}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {fieldError(error, 'options') && <p className="mt-2 text-sm text-marker">{fieldError(error, 'options')}</p>}
            {form.options.length < MAX_OPTIONS && (
              <Button variant="ghost" className="mt-2" onClick={addOption}>
                + Add option
              </Button>
            )}
          </fieldset>
        )}

        <DialogActions
          busy={busy}
          submitLabel={question ? 'Save question' : 'Add question'}
          onCancel={onClose}
          error={summaryMessage(error, FIELDS)}
        />
      </form>
    </Dialog>
  )
}

function AnswerChoice({ name, checked, onChange, children }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-3 font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
        checked ? 'border-pass bg-pass/10 text-pass' : 'border-rule text-ink-soft hover:border-ink/40'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && <span aria-hidden="true">✓</span>}
      {children}
    </label>
  )
}
