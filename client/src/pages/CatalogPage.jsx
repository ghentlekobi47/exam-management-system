import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { ConfirmDialog } from '../components/Dialog'
import { Alert, BackLink, Button, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui'

// Students browse every course and choose the ones they take
export function CatalogPage() {
  const { data, error, loading, reload } = useApi('/courses/catalog')
  const [busyId, setBusyId] = useState(null)
  const [dropping, setDropping] = useState(null) // the course being dropped
  const [actionError, setActionError] = useState(null)

  async function run(courseId, method) {
    setBusyId(courseId)
    setActionError(null)
    try {
      await api(`/courses/${courseId}/enroll`, { method })
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusyId(null)
      setDropping(null)
    }
  }

  return (
    <>
      <BackLink to="/">Your courses</BackLink>
      <PageHeader eyebrow="Course catalog" title="Choose your courses" />

      {actionError && (
        <div className="mb-6">
          <Alert>{actionError.message}</Alert>
        </div>
      )}

      {loading && <LoadingBlock label="Loading courses…" />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {data && data.courses.length === 0 && (
        <EmptyState title="No courses yet">An admin hasn&rsquo;t added any courses. Check back later.</EmptyState>
      )}

      {data && data.courses.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
            <li key={course.id} className="pt-5">
              <div className="relative flex h-full flex-col rounded-md border border-rule bg-sheet shadow-sheet">
                <span className="absolute -top-5 left-4 rounded-t-md border border-b-0 border-rule bg-sheet px-3 py-1 font-mono text-xs font-bold tracking-wider text-marker">
                  {course.code}
                </span>
                <div className="min-h-36 flex-1 px-5 pb-5 pt-6">
                  <h2 className="font-display text-xl font-semibold leading-snug text-ink">
                    {course.enrolled ? (
                      <Link to={`/courses/${course.id}`} className="hover:underline hover:underline-offset-4">
                        {course.title}
                      </Link>
                    ) : (
                      course.title
                    )}
                  </h2>
                  {course.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{course.description}</p>}
                  <p className="mt-3 text-sm text-ink-soft">{course.lecturer?.fullName ?? 'No lecturer yet'}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3 text-sm">
                  {course.enrolled ? (
                    <>
                      <span className="font-semibold text-ink">Enrolled ✓</span>
                      <Button
                        variant="ghost"
                        className="hover:text-marker"
                        busy={busyId === course.id}
                        onClick={() => setDropping(course)}
                      >
                        Drop
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-ink-soft">Not enrolled</span>
                      <Button busy={busyId === course.id} onClick={() => run(course.id, 'POST')}>
                        Join
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dropping && (
        <ConfirmDialog
          title={`Drop ${dropping.code}?`}
          confirmLabel="Drop course"
          tone="danger"
          busy={busyId === dropping.id}
          onCancel={() => setDropping(null)}
          onConfirm={() => run(dropping.id, 'DELETE')}
        >
          You will stop seeing this course and its exams. You can join it again later. Once you have started an exam
          in a course, only your lecturer or an admin can remove you.
        </ConfirmDialog>
      )}
    </>
  )
}
