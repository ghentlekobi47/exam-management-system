import { useEffect, useId } from 'react'
import { Button } from './ui'

// A centred pop-up. Closes on Escape or a click outside (unless `busy`).
export function Dialog({ title, children, onClose, busy = false, wide = false }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-10 sm:items-center"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full rounded-lg border border-rule bg-sheet p-6 shadow-sheet sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

// "Are you sure?" with a cancel and a confirm button
export function ConfirmDialog({ title, children, confirmLabel, tone = 'primary', busy, onCancel, onConfirm }) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy}>
      <div className="text-ink-soft">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </Button>
        <Button variant={tone} onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}

// Cancel / Save row at the bottom of a form inside a dialog
export function DialogActions({ busy, submitLabel, onCancel }) {
  return (
    <div className="mt-8 flex justify-end gap-3">
      <Button variant="secondary" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button type="submit" busy={busy}>
        {submitLabel}
      </Button>
    </div>
  )
}
