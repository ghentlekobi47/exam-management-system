import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const SLOW_AFTER_MS = 3000

// Free hosting puts the API to sleep when nobody uses it. If it doesn't answer quickly,
// explain the wait instead of letting the page look broken.
export function ServerWakeNotice() {
  const [state, setState] = useState('checking') // checking | slow | ready

  useEffect(() => {
    let done = false
    const slowTimer = setTimeout(() => {
      if (!done) setState('slow')
    }, SLOW_AFTER_MS)

    fetch(`${API_URL}/api/health`)
      .catch(() => null)
      .finally(() => {
        done = true
        clearTimeout(slowTimer)
        setState('ready')
      })

    return () => {
      done = true
      clearTimeout(slowTimer)
    }
  }, [])

  if (state !== 'slow') return null

  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-md border border-rule bg-paper px-4 py-3 text-sm text-ink">
      <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink border-t-transparent" aria-hidden="true" />
      <span>
        <b>Starting the server…</b> CampusIQ runs on a free plan that sleeps when it&apos;s not in use. This can take up
        to a minute. You can fill in the form meanwhile.
      </span>
    </div>
  )
}
