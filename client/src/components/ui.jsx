import { Link } from 'react-router'

const buttonStyles = {
  primary: 'bg-ink text-sheet hover:bg-ink/90 shadow-sm',
  secondary: 'bg-sheet text-ink border border-rule hover:border-ink/40 hover:bg-paper-deep/60',
  danger: 'bg-marker text-sheet hover:bg-marker/90 shadow-sm',
  ghost: 'text-ink-soft hover:text-ink hover:bg-paper-deep/70',
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function Button({ variant = 'primary', className = '', busy = false, children, ...props }) {
  return (
    <button
      type="button"
      className={`${buttonBase} ${buttonStyles[variant]} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && <Spinner small />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', className = '', children, ...props }) {
  return (
    <Link className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props}>
      {children}
    </Link>
  )
}

const inputBase =
  'block w-full rounded-md border bg-sheet px-3 py-2.5 text-ink placeholder:text-ink-soft/60 ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:bg-paper disabled:text-ink-soft '

// A labelled input. Use as="textarea" or as="select" (with <option> children) for those controls.
export function TextField({ label, error, hint, id, as: Control = 'input', className = '', ...props }) {
  const fieldId = id ?? props.name
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <Control
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={inputBase + (error ? 'border-marker' : 'border-rule')}
        {...props}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-marker">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${fieldId}-hint`} className="text-sm text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Checkbox({ label, hint, ...props }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-rule accent-ink" {...props} />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
    </label>
  )
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-marker/40 bg-marker/5 text-marker',
    info: 'border-rule bg-paper-deep/60 text-ink',
    success: 'border-pass/40 bg-pass/5 text-pass',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

export function Spinner({ small = false, label }) {
  const size = small ? 'h-4 w-4 border-2' : 'h-6 w-6 border-2'
  return (
    <span className="inline-flex items-center gap-2 text-ink-soft" role={label ? 'status' : undefined}>
      <span className={`${size} animate-spin rounded-full border-current border-t-transparent`} aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex justify-center py-16">
      <Spinner label={label} />
    </div>
  )
}

// A paper sheet: the main container for content
export function Sheet({ className = '', children, ...props }) {
  return (
    <div className={`rounded-md border border-rule bg-sheet shadow-sheet ${className}`} {...props}>
      {children}
    </div>
  )
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  )
}

const statusStyles = {
  open: 'border-pass/40 bg-pass/10 text-pass',
  published: 'border-pass/40 bg-pass/10 text-pass',
  submitted: 'border-pass/40 bg-pass/10 text-pass',
  upcoming: 'border-ink/20 bg-paper-deep text-ink',
  in_progress: 'border-highlight bg-highlight/50 text-ink',
  draft: 'border-dashed border-ink-soft/50 bg-transparent text-ink-soft',
  ended: 'border-rule bg-paper-deep text-ink-soft',
  closed: 'border-rule bg-paper-deep text-ink-soft',
  expired: 'border-marker/30 bg-marker/5 text-marker',
}

const statusLabels = {
  open: 'Open now',
  published: 'Published',
  submitted: 'Submitted',
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  draft: 'Draft',
  ended: 'Ended',
  closed: 'Closed',
  expired: 'Time ran out',
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${statusStyles[status] ?? statusStyles.closed}`}
    >
      {status === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-pass" aria-hidden="true" />}
      {statusLabels[status] ?? status}
    </span>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-md border border-dashed bg-sheet/70 border-rule px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</p>}
    </div>
  )
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
      <span aria-hidden="true">←</span> {children}
    </Link>
  )
}

// Shows a friendly message for an API error, with a retry button when it helps
export function ErrorBlock({ error, onRetry }) {
  return (
    <div className="space-y-3 py-8">
      <Alert>{error?.message ?? 'Something went wrong.'}</Alert>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
