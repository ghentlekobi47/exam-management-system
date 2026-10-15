import { useState } from 'react'
import { api } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import { ConfirmDialog } from '../../components/Dialog'
import { ImportQuestionsDialog } from '../../components/forms/ImportQuestionsDialog'
import { QuestionFormDialog } from '../../components/forms/QuestionFormDialog'
import { Alert, Button, EmptyState, Sheet } from '../../components/ui'

const typeLabels = { multiple_choice: 'Multiple choice', true_false: 'True / False' }

// The exam's questions with their answers. Editable while the exam is a draft.
export function QuestionsManager({ exam, onChanged }) {
  const editable = exam.status === 'draft'
  const [editing, setEditing] = useState(null) // null, 'new' or a question
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState(null)

  async function deleteQuestion() {
    setBusy(true)
    setError(null)
    try {
      await api(`/exams/${exam.id}/questions/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      onChanged()
    } catch (err) {
      setError(err)
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Questions</h2>
          <p className="text-sm text-ink-soft">
            {exam.questionCount} question{exam.questionCount === 1 ? '' : 's'} · {formatPoints(exam.totalPoints)} in total
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImporting(true)}>
              Import from CSV
            </Button>
            <Button onClick={() => setEditing('new')}>+ Add question</Button>
          </div>
        )}
      </div>

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      {!editable && (
        <div className="mb-4">
          <Alert tone="info">
            This exam is {exam.status}, so its questions are locked. Every student gets the same paper.
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert>{error.message}</Alert>
        </div>
      )}

      {exam.questions.length === 0 ? (
        <EmptyState title="No questions yet">
          Add true/false or multiple-choice questions one by one, or import many at once from a CSV spreadsheet. You
          can publish once there is at least one.
        </EmptyState>
      ) : (
        <Sheet>
          <ol className="divide-y divide-rule">
            {exam.questions.map((question, index) => (
              <li key={question.id} className="flex gap-4 px-5 py-5">
                <span className="w-7 shrink-0 text-lg font-semibold text-ink-soft">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{question.text}</p>
                    <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      {typeLabels[question.type]} · {formatPoints(question.points)}
                    </span>
                  </div>
                  <ul className={`mt-3 grid gap-1.5 ${question.type === 'true_false' ? 'grid-cols-2 sm:w-80' : ''}`}>
                    {question.options.map((option) => (
                      <li
                        key={option.id}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                          option.isCorrect ? 'bg-pass/10 font-semibold text-pass' : 'text-ink-soft'
                        }`}
                      >
                        <span aria-hidden="true">{option.isCorrect ? '✓' : '○'}</span>
                        {option.text}
                        {option.isCorrect && <span className="sr-only">(correct answer)</span>}
                      </li>
                    ))}
                  </ul>
                  {editable && (
                    <div className="mt-3 flex gap-1">
                      <Button variant="ghost" className="px-3 py-1.5" onClick={() => setEditing(question)}>
                        Edit
                      </Button>
                      <Button variant="ghost" className="px-3 py-1.5 hover:text-marker" onClick={() => setDeleting(question)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Sheet>
      )}

      {editing && (
        <QuestionFormDialog
          examId={exam.id}
          question={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}

      {importing && (
        <ImportQuestionsDialog
          examId={exam.id}
          onClose={() => setImporting(false)}
          onImported={(count) => {
            setImporting(false)
            setNotice(`Imported ${count} question${count === 1 ? '' : 's'}. Check them below, then publish when ready.`)
            onChanged()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete question?"
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={deleteQuestion}
        >
          “{deleting.text}” will be removed from this exam.
        </ConfirmDialog>
      )}
    </section>
  )
}
