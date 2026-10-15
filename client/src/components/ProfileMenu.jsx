import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { initials, roleLabels } from '../lib/format'

// The signed-in user's name and initials in the navbar; clicking opens their menu
export function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])
  const menuId = useId()

  const items = [
    { label: 'My profile', onSelect: () => navigate('/profile') },
    ...(user.role === 'student' ? [{ label: 'My results', onSelect: () => navigate('/results') }] : []),
    { label: 'Log out', onSelect: logout, danger: true },
  ]

  // Close when clicking anywhere else on the page
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Move the keyboard focus into the menu when it opens
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus()
  }, [open])

  function close({ focusButton = true } = {}) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function choose(item) {
    close({ focusButton: false })
    item.onSelect()
  }

  // ↑/↓ move between items, Escape closes, Tab leaves the menu
  function onMenuKeyDown(event) {
    const current = itemRefs.current.indexOf(document.activeElement)
    const last = items.length - 1
    const targets = { ArrowDown: current >= last ? 0 : current + 1, ArrowUp: current <= 0 ? last : current - 1, Home: 0, End: last }

    if (event.key in targets) {
      event.preventDefault()
      itemRefs.current[targets[event.key]]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`flex items-center gap-3 rounded-full py-1 pl-1 pr-1 transition-colors sm:rounded-lg sm:pl-3 ${
          open ? 'bg-paper-deep' : 'hover:bg-paper-deep'
        }`}
      >
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-semibold leading-tight text-ink">{user.fullName}</span>
          <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft">{roleLabels[user.role]}</span>
        </span>
        <Avatar name={user.fullName} />
        <svg viewBox="0 0 20 20" className={`hidden h-4 w-4 text-ink-soft transition-transform sm:block ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">Open your account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Your account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-rule bg-sheet shadow-sheet"
        >
          <div className="flex items-center gap-3 border-b border-rule px-4 py-4">
            <Avatar name={user.fullName} large />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-sm text-ink-soft">{user.email}</p>
              <span className="mt-1 inline-block rounded bg-ink/5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                {roleLabels[user.role]}
              </span>
            </div>
          </div>

          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => choose(item)}
                className={`block w-full px-4 py-2.5 text-left text-sm font-semibold focus:bg-paper-deep focus:outline-none ${
                  item.danger ? 'mt-1 border-t border-rule text-marker hover:bg-marker/5' : 'text-ink hover:bg-paper-deep'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Avatar({ name, large = false }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-rule bg-ink font-semibold text-sheet ${
        large ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm'
      }`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
