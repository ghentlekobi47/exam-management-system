// The CampusIQ wordmark: a small exam sheet with a tick, and the name.
// Use `light` on dark backgrounds.
export function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect x="5" y="3" width="20" height="26" rx="2" fill="#FFFFFF" stroke="#1F2A44" strokeWidth="2" />
        <line x1="10" y1="3" x2="10" y2="29" stroke="#C0392B" strokeWidth="1.5" />
        <line x1="13" y1="11" x2="21" y2="11" stroke="#1F2A44" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="16" x2="21" y2="16" stroke="#1F2A44" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 21.5l2.2 2.2 4.6-4.9" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Campus<span className={light ? 'text-[#ff8a7a]' : 'text-marker'}>IQ</span>
      </span>
    </span>
  )
}
