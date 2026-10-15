import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { examAvailability, formatDateTime, formatMinutes } from '../lib/format'
import { useApi } from '../lib/useApi'
import { useNow } from '../lib/useNow'
import { ConfirmDialog } from '../components/Dialog'
import { CourseFormDialog } from '../components/forms/CourseFormDialog'
import { ExamFormDialog } from '../components/forms/ExamFormDialog'
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
import { StudentsPanel } from './course/StudentsPanel'

export function CoursePage() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const course = useApi(`/courses/${courseId}`)
  const exams = useApi(`/courses/${courseId}/exams`)
  const now = useNow(30_000)
  const [dialog, setDialog] = useState(null) // 'edit' | 'delete' | 'exam'
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState(null)

  if (course.loading || exams.loading) return <LoadingBlock />
  if (course.error) return <ErrorBlock error={course.error} />
  if (exams.error) return <ErrorBlock error={exams.error} onRetry={exams.reload} />

  const { course: info } = course.data
  const list = exams.data.exams
  const isAdmin = user.role === 'admin'
  // Lecturers only ever see the courses they teach, so any staff member here can manage it
  const canManage = user.role !== 'student'

  async function deleteCourse() {
    setDeleteBusy(true)
    try {
      await api(`/courses/${info.id}`, { method: 'DELETE' })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err)
      setDialog(null)
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <BackLink to="/">All courses</BackLink>
      <PageHeader eyebrow={info.code} title={info.title}>
        {isAdmin && (
          <>
            <Button variant="secondary" onClick={() => setDialog('edit')}>
              Edit course
            </Button>
            <Button variant="ghost" className="hover:text-marker" onClick={() => setDialog('delete')}>
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      {info.description && <p className="-mt-4 mb-4 max-w-2xl text-ink-soft">{info.description}</p>}
      <p className="mb-8 text-sm text-ink-soft">
        Lecturer: <span className="font-semibold text-ink">{info.lecturer?.fullName ?? 'Not assigned'}</span>
      </p>

      {error && (
        <div className="mb-6">
          <Alert>{error.message}</Alert>
        </div>
      )}

      <div className={canManage ? 'grid gap-10 lg:grid-cols-[1fr_22rem]' : ''}>
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Exams</h2>
            {canManage && <Button onClick={() => setDialog('exam')}>+ New exam</Button>}
          </div>

          {list.length === 0 ? (
            <EmptyState title="No exams on the board yet">
              {canManage
                ? 'Create an exam, add its questions, then publish it for your students.'
                : 'When your lecturer publishes an exam for this course, it will appear here.'}
            </EmptyState>
          ) : (
            <Sheet>
              <ul className="divide-y divide-rule">
                {list.map((exam) => (
                  <li key={exam.id}>
                    <Link
                      to={`/exams/${exam.id}`}
                      className="flex flex-col gap-3 px-5 py-5 transition-colors hover:bg-paper/70 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-lg font-semibold text-ink">{exam.title}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {formatDateTime(exam.startAt)} – {formatDateTime(exam.endAt)} · {formatMinutes(exam.durationMinutes)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={canManage && exam.status === 'draft' ? 'draft' : examAvailability(exam, now)} />
                        <span className="text-sm font-semibold text-ink" aria-hidden="true">
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Sheet>
          )}
        </section>

        {canManage && <StudentsPanel courseId={info.id} />}
      </div>

      {dialog === 'edit' && (
        <CourseFormDialog
          course={info}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            course.reload()
          }}
        />
      )}

      {dialog === 'exam' && (
        <ExamFormDialog
          courseId={info.id}
          onClose={() => setDialog(null)}
          onSaved={(exam) => navigate(`/exams/${exam.id}`)}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title={`Delete ${info.code}?`}
          confirmLabel="Delete course"
          tone="danger"
          busy={deleteBusy}
          onCancel={() => setDialog(null)}
          onConfirm={deleteCourse}
        >
          The course, its enrollments and its exams are deleted for good. Courses whose exams students have already
          taken can't be deleted, so results stay safe.
        </ConfirmDialog>
      )}
    </>
  )
}
