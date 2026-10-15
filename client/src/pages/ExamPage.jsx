import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api, apiDownload } from '../lib/api'
import { examAvailability, formatDateTime, formatMinutes, formatPoints } from '../lib/format'
import { useApi } from '../lib/useApi'
import { useNow } from '../lib/useNow'
import { Stamp } from '../components/Stamp'
import { MeterTile, StatTile } from '../components/Stats'
import { ExamStaffActions } from './exam/ExamStaffActions'
import { QuestionsManager } from './exam/QuestionsManager'
import {
  Alert,
  BackLink,
  Button,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Sheet,
  StatusBadge,
} from '../components/ui'

export function ExamPage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const exam = useApi(`/exams/${examId}`)
  const attempts = useApi(`/exams/${examId}/attempts`)
  const now = useNow(15_000)

  if (exam.loading || attempts.loading) return <LoadingBlock />
  if (exam.error) return <ErrorBlock error={exam.error} />
  if (attempts.error) return <ErrorBlock error={attempts.error} onRetry={attempts.reload} />

  const info = exam.data.exam
  const isStudent = user.role === 'student'
  const availability = examAvailability(info, now)

  return (
    <>
      <BackLink to={`/courses/${info.courseId}`}>Back to course</BackLink>
      <PageHeader eyebrow="Exam" title={info.title}>
        <StatusBadge status={isStudent ? availability : info.status} />
      </PageHeader>

      {!isStudent && (
        <div className="-mt-4 mb-8">
          <ExamStaffActions
            exam={info}
            onChanged={() => {
              exam.reload()
              attempts.reload()
            }}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <Sheet className="px-6 py-6">
            <h2 className="mb-2 text-lg font-semibold">Instructions</h2>
            <p className="whitespace-pre-line text-ink">{info.instructions || 'No special instructions.'}</p>
          </Sheet>

          {isStudent ? (
            <StudentAttempts data={attempts.data} />
          ) : info.status === 'draft' ? (
            <QuestionsManager exam={info} onChanged={exam.reload} />
          ) : (
            <>
              <StaffResults examId={info.id} data={attempts.data} />
              <QuestionsManager exam={info} onChanged={exam.reload} />
            </>
          )}
        </div>

        <aside className="space-y-6">
          <Sheet className="divide-y divide-rule">
            <Fact label="Opens" value={formatDateTime(info.startAt)} />
            <Fact label="Closes" value={formatDateTime(info.endAt)} />
            <Fact label="Time allowed" value={formatMinutes(info.durationMinutes)} />
            <Fact label="Questions" value={`${info.questionCount} · ${formatPoints(info.totalPoints)}`} />
            <Fact label="Pass mark" value={info.passMark === null ? 'None' : `${info.passMark}%`} />
            <Fact label="Attempts allowed" value={info.maxAttempts} />
          </Sheet>

          {isStudent && (
            <StartPanel examId={info.id} availability={availability} attempts={attempts.data} />
          )}
        </aside>
      </div>
    </>
  )
}

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  )
}

const unavailableMessages = {
  upcoming: 'This exam has not opened yet.',
  ended: 'This exam has ended.',
  closed: 'Your lecturer has closed this exam.',
  draft: 'This exam is not published yet.',
}

function StartPanel({ examId, availability, attempts }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const open = attempts.attempts.find((a) => a.status === 'in_progress')
  const left = attempts.maxAttempts - attempts.attemptsUsed

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const { attempt } = await api(`/exams/${examId}/attempts`, { method: 'POST' })
      navigate(`/attempts/${attempt.id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <Sheet className="space-y-4 px-5 py-5">
      <p className="text-sm text-ink-soft">
        Attempts used: <span className="font-semibold text-ink">{attempts.attemptsUsed}</span> of {attempts.maxAttempts}
      </p>

      {error && <Alert>{error.message}</Alert>}

      {availability !== 'open' ? (
        <p className="text-sm text-ink">{unavailableMessages[availability]}</p>
      ) : open ? (
        <Button className="w-full" onClick={start} busy={busy}>
          Resume exam
        </Button>
      ) : left > 0 ? (
        <>
          <Button className="w-full" onClick={start} busy={busy}>
            {attempts.attemptsUsed === 0 ? 'Start exam' : 'Start another attempt'}
          </Button>
          <p className="text-xs text-ink-soft">
            The timer starts as soon as you begin. Your answers are saved as you go.
          </p>
        </>
      ) : (
        <p className="text-sm text-ink">You have used all your attempts.</p>
      )}
    </Sheet>
  )
}

function StudentAttempts({ data }) {
  const finished = data.attempts.filter((a) => a.status !== 'in_progress')

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Your results</h2>
      {finished.length === 0 ? (
        <EmptyState title="No results yet">Your score will appear here after you hand in the exam.</EmptyState>
      ) : (
        <Sheet>
          <ul className="divide-y divide-rule">
            {finished.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/attempts/${a.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper-deep/50"
                >
                  <div>
                    <p className="font-semibold text-ink">Attempt {a.attemptNumber}</p>
                    <p className="text-sm text-ink-soft">{formatDateTime(a.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xl font-semibold text-marker">
                      {a.score}/{a.totalPoints}
                    </span>
                    {a.passed !== null && <span className="hidden scale-75 sm:inline-block"><Stamp passed={a.passed} /></span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </section>
  )
}

function StaffResults({ examId, data }) {
  const { summary } = data
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)
  const percent = (value) => (value === null ? '–' : `${value}%`)

  async function download() {
    setDownloading(true)
    setError(null)
    try {
      await apiDownload(`/exams/${examId}/results.csv`, 'exam-results.csv')
    } catch (err) {
      setError(err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Student results</h2>
        {data.attempts.length > 0 && (
          <Button variant="secondary" onClick={download} busy={downloading}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download CSV
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MeterTile
          label="Students who finished"
          value={summary.studentsFinished}
          max={summary.enrolledCount}
          note={summary.inProgress > 0 ? `${summary.inProgress} writing now` : 'Enrolled in the course'}
        />
        <StatTile label="Average score" value={percent(summary.averagePercentage)} note="Each student's best attempt" />
        <StatTile
          label="Highest / lowest"
          value={
            summary.highestPercentage === null
              ? '–'
              : `${summary.highestPercentage}% / ${summary.lowestPercentage}%`
          }
        />
        {summary.passedCount === null ? (
          <StatTile label="Passed" value="–" note="This exam has no pass mark" />
        ) : (
          <MeterTile label="Passed" value={summary.passedCount} max={summary.studentsFinished} note="Of the students who finished" />
        )}
      </div>

      {data.attempts.length === 0 ? (
        <EmptyState title="No attempts yet">Results appear here as students hand in the exam.</EmptyState>
      ) : (
        <Sheet className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-bold">Student</th>
                <th className="px-3 py-3 font-bold">Attempt</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 text-right font-bold">Score</th>
                <th className="px-5 py-3 text-right font-bold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {data.attempts.map((a) => (
                <tr key={a.id} className="hover:bg-paper-deep/50">
                  <td className="px-5 py-3">
                    <Link to={`/attempts/${a.id}`} className="font-semibold text-ink underline decoration-rule underline-offset-4 hover:decoration-marker">
                      {a.student.fullName}
                    </Link>
                    <p className="text-xs text-ink-soft">{a.student.email}</p>
                  </td>
                  <td className="px-3 py-3">#{a.attemptNumber}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {a.status === 'in_progress' ? '–' : `${a.score}/${a.totalPoints}`}
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${a.passed === false ? 'text-marker' : a.passed ? 'text-pass' : ''}`}>
                    {a.status === 'in_progress' ? '–' : `${a.percentage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sheet>
      )}
    </section>
  )
}
