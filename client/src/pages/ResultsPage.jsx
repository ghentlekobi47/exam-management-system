import { Link } from 'react-router'
import { formatDateTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { Stamp } from '../components/Stamp'
import { MeterTile, StatTile } from '../components/Stats'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Sheet, StatusBadge } from '../components/ui'

// A student's results across every course, newest first
export function ResultsPage() {
  const { data, error, loading, reload } = useApi('/attempts')

  if (loading) return <LoadingBlock label="Loading your results…" />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  const results = data.results
  const summary = summarize(results)

  return (
    <>
      <PageHeader eyebrow="Your results" title="Results" />

      {results.length === 0 ? (
        <EmptyState title="No results yet">
          When you hand in an exam, your score shows up here.{' '}
          <Link to="/" className="font-semibold text-ink underline underline-offset-4">
            Go to your courses
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatTile label="Exams taken" value={summary.examCount} note={`${results.length} attempt${results.length === 1 ? '' : 's'} in total`} />
            <StatTile label="Average score" value={`${summary.average}%`} note="Your best attempt at each exam" />
            {summary.withPassMark > 0 ? (
              <MeterTile label="Exams passed" value={summary.passed} max={summary.withPassMark} note="Exams that have a pass mark" />
            ) : (
              <StatTile label="Exams passed" value="–" note="None of your exams have a pass mark" />
            )}
          </div>

          <Sheet>
            <ul className="divide-y divide-rule">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    to={`/attempts/${result.id}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-paper/70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold tracking-wider text-marker">{result.course.code}</p>
                      <p className="truncate text-lg font-semibold text-ink">{result.examTitle}</p>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                        Attempt {result.attemptNumber} · {formatDateTime(result.submittedAt)}
                        {result.status === 'expired' && <StatusBadge status="expired" />}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-2xl font-semibold tabular-nums text-ink">{result.percentage}%</p>
                        <p className="text-sm text-ink-soft">
                          {result.score}/{result.totalPoints} pts
                        </p>
                      </div>
                      {result.passed !== null && (
                        <span className="w-32 scale-75 text-center">
                          <Stamp passed={result.passed} />
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Sheet>
        </>
      )}
    </>
  )
}

// Uses the best attempt at each exam
function summarize(results) {
  const best = new Map()
  for (const result of results) {
    const current = best.get(result.examId)
    if (!current || result.percentage > current.percentage) best.set(result.examId, result)
  }

  const exams = [...best.values()]
  const withPassMark = exams.filter((r) => r.passed !== null)
  const total = exams.reduce((sum, r) => sum + r.percentage, 0)

  return {
    examCount: exams.length,
    average: exams.length ? Math.round((total / exams.length) * 10) / 10 : 0,
    withPassMark: withPassMark.length,
    passed: withPassMark.filter((r) => r.passed).length,
  }
}
