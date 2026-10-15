import { formatDateTime, formatPoints } from '../../lib/format'
import { ScoreMark } from '../../components/ScoreMark'
import { Stamp } from '../../components/Stamp'
import { BackLink, Sheet, StatusBadge } from '../../components/ui'

// The marked paper, for lecturers and admins: each answer ticked or crossed
export function AttemptBreakdown({ attempt }) {
  return (
    <>
      <BackLink to={`/exams/${attempt.examId}`}>Back to exam results</BackLink>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
            {attempt.examTitle} · Attempt {attempt.attemptNumber}
          </p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{attempt.student.fullName}</h1>
          <p className="text-ink-soft">{attempt.student.email}</p>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink-soft">
            <StatusBadge status={attempt.status} />
            {attempt.submittedAt && <span>Handed in {formatDateTime(attempt.submittedAt)}</span>}
          </div>
        </div>
        {attempt.status !== 'in_progress' && (
          <div className="flex items-center gap-6">
            <ScoreMark score={attempt.score} total={attempt.totalPoints} percentage={attempt.percentage} size="sm" />
            {attempt.passed !== null && <Stamp passed={attempt.passed} />}
          </div>
        )}
      </div>

      <Sheet className="margin-line overflow-hidden">
        <ol>
          {attempt.questions.map((question, index) => (
            <li key={question.id} className="relative border-b border-rule py-7 pl-16 pr-6 last:border-b-0 sm:pl-24">
              <span className="absolute left-0 top-7 w-12 text-right font-display text-xl font-semibold text-ink-soft sm:w-16">
                {index + 1}.
              </span>
              <span
                className={`absolute right-5 top-6 font-display text-3xl font-bold ${question.isCorrect ? 'text-pass' : 'text-marker'}`}
                aria-hidden="true"
              >
                {question.isCorrect ? '✓' : '✗'}
              </span>

              <p className="pr-10 font-display text-xl leading-snug text-ink">{question.text}</p>
              <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
                {question.pointsAwarded} / {formatPoints(question.points)}
                <span className="sr-only">{question.isCorrect ? ', correct' : ', incorrect'}</span>
              </p>

              <ul className="mt-4 space-y-1.5">
                {question.options.map((option) => {
                  const picked = option.id === question.selectedOptionId
                  return (
                    <li key={option.id} className="flex items-center gap-3">
                      <span className="w-5 text-center font-bold" aria-hidden="true">
                        {option.isCorrect ? <span className="text-pass">✓</span> : picked ? <span className="text-marker">✗</span> : ''}
                      </span>
                      <span
                        className={`${picked ? 'highlighted px-1' : ''} ${option.isCorrect ? 'font-semibold text-pass' : 'text-ink'}`}
                      >
                        {option.text}
                      </span>
                      {picked && <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">student's answer</span>}
                      {option.isCorrect && <span className="sr-only">(correct answer)</span>}
                    </li>
                  )
                })}
              </ul>
              {question.selectedOptionId === null && (
                <p className="mt-3 text-sm italic text-marker">No answer given.</p>
              )}
            </li>
          ))}
        </ol>
      </Sheet>
    </>
  )
}
