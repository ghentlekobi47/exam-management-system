import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { formatClock, formatPoints } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { Alert, Button, Sheet } from '../../components/ui'

// The exam sheet a student fills in. Answers save as they click; the clock submits at zero.
export function TakeExam({ attempt, onFinished }) {
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedOptionId])),
  )
  const [saveState, setSaveState] = useState({})
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const finishingRef = useRef(false)

  // Count down from the server's remaining time, so a wrong computer clock doesn't matter
  const [endsAt] = useState(() => Date.now() + attempt.remainingSeconds * 1000)
  const now = useNow(1000)
  const remainingSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const timeUp = remainingSeconds === 0

  const answeredCount = attempt.questions.filter((q) => answers[q.id] != null).length
  const unanswered = attempt.questions.length - answeredCount

  // Time's up: hand in whatever is saved
  useEffect(() => {
    if (!timeUp || finishingRef.current) return
    finishingRef.current = true
    api(`/attempts/${attempt.id}/submit`, { method: 'POST' })
      .catch(() => {})
      .finally(onFinished)
  }, [timeUp, attempt.id, onFinished])

  async function choose(questionId, optionId) {
    const previous = answers[questionId] ?? null
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
    setSaveState((current) => ({ ...current, [questionId]: 'saving' }))
    setError(null)

    try {
      await api(`/attempts/${attempt.id}/answers`, {
        method: 'PUT',
        body: { questionId, optionId },
      })
      setSaveState((current) => ({ ...current, [questionId]: 'saved' }))
    } catch (err) {
      if (err.status === 409) {
        onFinished()
        return
      }
      setAnswers((current) => ({ ...current, [questionId]: previous }))
      setSaveState((current) => ({ ...current, [questionId]: 'error' }))
      setError(err)
    }
  }

  async function handIn() {
    if (finishingRef.current) return
    finishingRef.current = true
    setSubmitting(true)
    try {
      await api(`/attempts/${attempt.id}/submit`, { method: 'POST' })
    } catch (err) {
      if (err.status !== 409) {
        finishingRef.current = false
        setSubmitting(false)
        setConfirming(false)
        setError(err)
        return
      }
    }
    onFinished()
  }

  const urgent = remainingSeconds <= 60
  const warning = remainingSeconds <= 300

  return (
    <div className="pb-28 sm:pb-0">
      {/* Sticky bar: title, progress and the invigilator's clock */}
      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-ink">{attempt.examTitle}</p>
            <p className="text-sm text-ink-soft">
              {answeredCount} of {attempt.questions.length} answered · Attempt {attempt.attemptNumber}
            </p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xl font-bold tabular-nums ${
              urgent
                ? 'clock-urgent border-marker bg-marker text-sheet'
                : warning
                  ? 'border-marker/50 bg-marker/5 text-marker'
                  : 'border-rule bg-sheet text-ink'
            }`}
          >
            <span className="sr-only">Time left:</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 9v4l2.5 2M9 2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {formatClock(remainingSeconds)}
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <div
            className="h-full bg-ink transition-[width] duration-300"
            style={{ width: `${(answeredCount / attempt.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Screen readers hear the time only at a few moments, not every second */}
      <p className="sr-only" aria-live="assertive">
        {timeUp ? 'Time is up. Your exam is being handed in.' : urgent ? 'One minute left.' : warning ? 'Five minutes left.' : ''}
      </p>

      {attempt.instructions && (
        <p className="mb-6 rounded-md border border-dashed border-rule px-4 py-3 text-sm text-ink-soft">
          {attempt.instructions}
        </p>
      )}

      {error && (
        <div className="mb-6">
          <Alert>{error.message}</Alert>
        </div>
      )}

      <Sheet className="margin-line overflow-hidden">
        <ol>
          {attempt.questions.map((question, index) => (
            <QuestionBlock
              key={question.id}
              number={index + 1}
              question={question}
              selected={answers[question.id] ?? null}
              state={saveState[question.id]}
              disabled={timeUp || submitting}
              onChoose={(optionId) => choose(question.id, optionId)}
            />
          ))}
        </ol>

        <div className="border-t border-rule py-8 pl-16 pr-6 sm:pl-24">
          <p className="font-display text-lg text-ink">End of paper.</p>
          <p className="mt-1 text-sm text-ink-soft">
            {unanswered === 0
              ? 'Every question has an answer. Hand in when you are ready.'
              : `${unanswered} question${unanswered === 1 ? '' : 's'} still without an answer.`}
          </p>
          <Button className="mt-5 hidden sm:inline-flex" onClick={() => setConfirming(true)} disabled={timeUp}>
            Hand in exam
          </Button>
        </div>
      </Sheet>

      {/* On phones the hand-in button stays at the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:hidden">
        <Button className="w-full" onClick={() => setConfirming(true)} disabled={timeUp}>
          Hand in exam · {answeredCount}/{attempt.questions.length}
        </Button>
      </div>

      {confirming && (
        <ConfirmHandIn
          unanswered={unanswered}
          busy={submitting}
          onCancel={() => setConfirming(false)}
          onConfirm={handIn}
        />
      )}
    </div>
  )
}

const saveLabels = { saving: 'Saving…', saved: 'Saved', error: 'Not saved' }

function QuestionBlock({ number, question, selected, state, disabled, onChoose }) {
  const groupName = `question-${question.id}`

  return (
    <li className="relative border-b border-rule py-8 pl-16 pr-6 last:border-b-0 sm:pl-24">
      <span className="absolute left-0 top-8 w-12 text-right font-display text-xl font-semibold text-ink-soft sm:w-16">
        {number}.
      </span>

      <fieldset disabled={disabled}>
        <legend className="flex w-full items-start justify-between gap-4">
          <span className="font-display text-xl leading-snug text-ink">{question.text}</span>
          <span className="shrink-0 pt-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
            {formatPoints(question.points)}
          </span>
        </legend>

        <div className={`mt-5 grid gap-2 ${question.type === 'true_false' ? 'sm:grid-cols-2' : ''}`}>
          {question.options.map((option) => {
            const checked = selected === option.id
            return (
              <label
                key={option.id}
                className={`group flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                  checked ? 'border-ink/40 bg-paper-deep/40' : 'border-transparent hover:border-rule hover:bg-paper-deep/30'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={checked}
                  onChange={() => onChoose(option.id)}
                  className="sr-only"
                />
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked ? 'border-ink' : 'border-ink/35 group-hover:border-ink/60'
                  }`}
                  aria-hidden="true"
                >
                  {checked && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                </span>
                <span className={`text-lg text-ink ${checked ? 'highlighted px-1' : ''}`}>{option.text}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <p
        className={`mt-3 h-4 text-xs ${state === 'error' ? 'text-marker' : 'text-ink-soft'}`}
        aria-live="polite"
      >
        {state && saveLabels[state]}
      </p>
    </li>
  )
}

function ConfirmHandIn({ unanswered, busy, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-4" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-in-title"
        className="w-full max-w-md rounded-md border border-rule bg-sheet p-6 shadow-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="hand-in-title" className="text-2xl font-semibold">
          Hand in your exam?
        </h2>
        <p className="mt-3 text-ink-soft">
          {unanswered === 0
            ? 'You have answered every question.'
            : `You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}; they will score zero.`}{' '}
          You can't change your answers after handing in.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy} autoFocus>
            Keep working
          </Button>
          <Button onClick={onConfirm} busy={busy}>
            Hand in
          </Button>
        </div>
      </div>
    </div>
  )
}
