const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(value) {
  return value ? dateTime.format(new Date(value)) : ''
}

export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// 754 seconds -> "12:34"; over an hour -> "1:02:34"
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// ISO date -> { date: '2026-10-20', time: '09:00' } for separate date and time inputs,
// in the user's own time zone
export function toDateAndTime(value) {
  if (!value) return { date: '', time: '' }
  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const local = new Date(date.getTime() - offsetMs).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}

// Separate date and time input values -> a Date, or null if either is missing
export function fromDateAndTime(date, time) {
  if (!date || !time) return null
  const result = new Date(`${date}T${time}`)
  return Number.isNaN(result.getTime()) ? null : result
}

// 90 -> "1 hour 30 minutes", 10080 -> "7 days"
export function formatSpan(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = Math.round(totalMinutes % 60)
  const part = (n, word) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : null)
  return [part(days, 'day'), part(hours, 'hour'), part(minutes, 'minute')].filter(Boolean).join(' ') || '0 minutes'
}

export function formatPoints(points) {
  return `${points} ${points === 1 ? 'pt' : 'pts'}`
}

// Where an exam is in its life, from a student's point of view
export function examAvailability(exam, now) {
  if (exam.status === 'draft') return 'draft'
  if (exam.status === 'closed') return 'closed'
  if (now < new Date(exam.startAt).getTime()) return 'upcoming'
  if (now >= new Date(exam.endAt).getTime()) return 'ended'
  return 'open'
}
