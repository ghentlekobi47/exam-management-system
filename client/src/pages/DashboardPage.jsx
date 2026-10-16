import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useApi } from '../lib/useApi'
import { CourseFormDialog } from '../components/forms/CourseFormDialog'
import { Button, ButtonLink, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui'

const emptyMessages = {
  student: 'You haven’t selected any courses yet. Use “Browse courses” to pick yours.',
  lecturer: 'You are not teaching any courses yet. An admin assigns courses to lecturers.',
  admin: 'There are no courses yet. Create the first one with “New course”.',
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi('/courses')
  const [creating, setCreating] = useState(false)
  const firstName = user.fullName.split(' ')[0]
  const isAdmin = user.role === 'admin'
  const eyebrow = { admin: 'All courses', lecturer: 'Courses you teach', student: 'Your courses' }[user.role]

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={`Hello, ${firstName}`}>
        {isAdmin && <Button onClick={() => setCreating(true)}>+ New course</Button>}
        {user.role === 'student' && <ButtonLink to="/courses/browse">+ Browse courses</ButtonLink>}
      </PageHeader>

      {creating && (
        <CourseFormDialog onClose={() => setCreating(false)} onSaved={(course) => navigate(`/courses/${course.id}`)} />
      )}

      {loading && <LoadingBlock label="Loading your courses…" />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {data && data.courses.length === 0 && (
        <EmptyState title="Nothing on your desk yet">{emptyMessages[user.role]}</EmptyState>
      )}

      {data && data.courses.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Looks like an index card in a folder, with the course code on the tab
function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.id}`} className="group block pt-5 focus-visible:outline-none">
      <div className="relative h-full rounded-md border border-rule bg-sheet shadow-sheet transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-ink">
        <span className="absolute -top-5 left-4 rounded-t-md border border-b-0 border-rule bg-sheet px-3 py-1 font-mono text-xs font-bold tracking-wider text-marker">
          {course.code}
        </span>
        <div className="min-h-36 px-5 pb-5 pt-6">
          <h2 className="font-display text-xl font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-marker/50 group-hover:underline-offset-4">
            {course.title}
          </h2>
          {course.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{course.description}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-rule px-5 py-3 text-sm">
          <span className="text-ink-soft">{course.lecturer?.fullName ?? 'No lecturer'}</span>
          <span className="font-semibold text-ink" aria-hidden="true">
            Open →
          </span>
        </div>
      </div>
    </Link>
  )
}
