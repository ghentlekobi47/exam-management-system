import { useParams } from 'react-router'
import { useApi } from '../lib/useApi'
import { ErrorBlock, LoadingBlock } from '../components/ui'
import { AttemptBreakdown } from './attempt/AttemptBreakdown'
import { AttemptResult } from './attempt/AttemptResult'
import { TakeExam } from './attempt/TakeExam'

// One address for an attempt: the exam sheet while answering, the result after,
// or the marked breakdown for staff
export function AttemptPage() {
  const { attemptId } = useParams()
  const { data, error, loading, reload } = useApi(`/attempts/${attemptId}`)

  if (loading) return <LoadingBlock />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  const { attempt } = data

  if (attempt.student) return <AttemptBreakdown attempt={attempt} />
  if (attempt.status === 'in_progress') return <TakeExam key={attempt.id} attempt={attempt} onFinished={reload} />
  return <AttemptResult attempt={attempt} />
}
