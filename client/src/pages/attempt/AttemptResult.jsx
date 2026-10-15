import { formatDateTime } from '../../lib/format'
import { ScoreMark } from '../../components/ScoreMark'
import { Stamp } from '../../components/Stamp'
import { ButtonLink, Sheet } from '../../components/ui'

// What a student sees after handing in: their mark, never the answers
export function AttemptResult({ attempt }) {
  return (
    <div className="mx-auto max-w-xl">
      <Sheet className="margin-line relative overflow-hidden py-12 pl-20 pr-8 text-center sm:pl-24">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
          {attempt.examTitle} · Attempt {attempt.attemptNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Your result</h1>

        <div className="mt-8 flex justify-center">
          <ScoreMark score={attempt.score} total={attempt.totalPoints} percentage={attempt.percentage} />
        </div>

        {attempt.passed !== null && (
          <div className="mt-8">
            <Stamp passed={attempt.passed} />
          </div>
        )}

        <p className="mt-8 text-sm text-ink-soft">
          {attempt.status === 'expired'
            ? 'Time ran out, so your saved answers were handed in automatically.'
            : `Handed in ${formatDateTime(attempt.submittedAt)}.`}
        </p>
        <p className="mt-1 text-sm text-ink-soft">Correct answers are not shown for this exam.</p>
      </Sheet>

      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink to={`/exams/${attempt.examId}`} variant="secondary">
          Back to exam
        </ButtonLink>
        <ButtonLink to="/">My courses</ButtonLink>
      </div>
    </div>
  )
}
