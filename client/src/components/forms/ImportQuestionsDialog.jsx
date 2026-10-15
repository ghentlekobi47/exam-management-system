import { useState } from 'react'
import { api } from '../../lib/api'
import { Dialog } from '../Dialog'
import { Alert, Button } from '../ui'

const TEMPLATE_URL = '/templates/campusiq-questions-template.csv'

// Upload a CSV of questions into a draft exam. The server checks every row first:
// if any row is wrong, nothing is imported and each problem is listed.
export function ImportQuestionsDialog({ examId, onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const csv = await file.text()
      const { imported } = await api(`/exams/${examId}/questions/import`, { method: 'POST', body: { csv } })
      onImported(imported)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const rowProblems = error?.details?.rows

  return (
    <Dialog title="Import questions from CSV" onClose={onClose} busy={busy} wide>
      <form onSubmit={handleSubmit} className="space-y-6">
        <ol className="space-y-3 text-sm text-ink">
          <li className="flex gap-3">
            <Step n={1} />
            <span>
              <a href={TEMPLATE_URL} download className="font-semibold text-ink underline decoration-marker/60 underline-offset-4 hover:decoration-marker">
                Download the template
              </a>{' '}
              and open it in Excel or Google Sheets.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>
              Add one question per row, replacing the examples:
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                <li>
                  <b className="text-ink">type</b>: <code className="font-mono text-xs">multiple_choice</code> or{' '}
                  <code className="font-mono text-xs">true_false</code>
                </li>
                <li>
                  <b className="text-ink">points</b>: leave empty for 1
                </li>
                <li>
                  <b className="text-ink">option_a … option_f</b>: 2 to 6 options, filled in order (empty for true/false)
                </li>
                <li>
                  <b className="text-ink">correct</b>: the option letter (A–F), or TRUE / FALSE
                </li>
              </ul>
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>Save as CSV (File → Save as → CSV) and choose it below.</span>
          </li>
        </ol>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
            file ? 'border-pass/50 bg-pass/5' : 'border-rule hover:border-ink/40 hover:bg-paper'
          }`}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
            }}
          />
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-soft" aria-hidden="true">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {file ? (
            <span className="font-semibold text-ink">{file.name}</span>
          ) : (
            <span className="font-semibold text-ink">Choose a CSV file</span>
          )}
          <span className="text-xs text-ink-soft">{file ? 'Click to choose a different file' : 'Up to 200 questions'}</span>
        </label>

        {error && (
          <Alert>
            <p className="font-semibold">{error.message}</p>
            {rowProblems && (
              <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
                {rowProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            {rowProblems && <p className="mt-2">Fix these rows in your spreadsheet, save, and choose the file again.</p>}
          </Alert>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} disabled={!file}>
            Import questions
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function Step({ n }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-sheet" aria-hidden="true">
      {n}
    </span>
  )
}
