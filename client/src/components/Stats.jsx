// Headline numbers: a label and a value, with an optional note underneath
export function StatTile({ label, value, note }) {
  return (
    <div className="rounded-lg border border-rule bg-sheet px-5 py-4 shadow-sheet">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
    </div>
  )
}

// A ratio against a limit, e.g. "18 of 25 students": a label, the numbers, and a track
export function MeterTile({ label, value, max, note }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div className="rounded-lg border border-rule bg-sheet px-5 py-4 shadow-sheet">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
        {value}
        <span className="text-lg font-medium text-ink-soft"> of {max}</span>
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}`}
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
      {note && <p className="mt-2 text-xs text-ink-soft">{note}</p>}
    </div>
  )
}
