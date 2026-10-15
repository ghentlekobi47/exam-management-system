import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../lib/api'
import { ConfirmDialog } from '../../components/Dialog'
import { ExamFormDialog } from '../../components/forms/ExamFormDialog'
import { Alert, Button } from '../../components/ui'

// Edit / Publish / Close / Delete buttons for the exam's lecturer or an admin
export function ExamStaffActions({ exam, onChanged }) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState(null) // 'edit' | 'publish' | 'close' | 'delete'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      if (action === 'delete') {
        await api(`/exams/${exam.id}`, { method: 'DELETE' })
        navigate(`/courses/${exam.courseId}`, { replace: true })
        return
      }
      await api(`/exams/${exam.id}/${action}`, { method: 'POST' })
      setDialog(null)
      onChanged()
    } catch (err) {
      setError(err)
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  const close = () => setDialog(null)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {exam.status === 'draft' && (
          <>
            <Button variant="secondary" onClick={() => setDialog('edit')}>
              Edit details
            </Button>
            <Button onClick={() => setDialog('publish')} disabled={exam.questionCount === 0}>
              Publish
            </Button>
          </>
        )}
        {exam.status === 'published' && (
          <Button variant="secondary" onClick={() => setDialog('close')}>
            Close exam
          </Button>
        )}
        <Button variant="ghost" className="hover:text-marker" onClick={() => setDialog('delete')}>
          Delete
        </Button>
      </div>

      {error && (
        <div className="mt-4 w-full">
          <Alert>{error.message}</Alert>
        </div>
      )}

      {dialog === 'edit' && (
        <ExamFormDialog
          exam={exam}
          onClose={close}
          onSaved={() => {
            close()
            onChanged()
          }}
        />
      )}

      {dialog === 'publish' && (
        <ConfirmDialog title="Publish this exam?" confirmLabel="Publish" busy={busy} onCancel={close} onConfirm={() => run('publish')}>
          Enrolled students will see it and can start it between the open and close times. After publishing, the
          questions are locked and can't be edited.
        </ConfirmDialog>
      )}

      {dialog === 'close' && (
        <ConfirmDialog title="Close this exam?" confirmLabel="Close exam" tone="danger" busy={busy} onCancel={close} onConfirm={() => run('close')}>
          No one can start it any more, and anyone still writing is handed in automatically with the answers they have
          saved.
        </ConfirmDialog>
      )}

      {dialog === 'delete' && (
        <ConfirmDialog title="Delete this exam?" confirmLabel="Delete exam" tone="danger" busy={busy} onCancel={close} onConfirm={() => run('delete')}>
          The exam and its questions are deleted for good. Exams that students have already attempted can't be
          deleted, so their results stay safe.
        </ConfirmDialog>
      )}
    </>
  )
}
