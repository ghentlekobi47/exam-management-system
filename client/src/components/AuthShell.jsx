import { Logo } from './Logo'
import { ServerWakeNotice } from './ServerWakeNotice'

// Split screen for login and register: the exam photo on one side, the form on the other
export function AuthShell({ title, subtitle, children, footer, beforeTitle }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img
          src="/images/exam-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Navy wash so the white text stays readable over the photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/65 to-ink/90" aria-hidden="true" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative max-w-md text-white">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-white/70">Online exams</p>
          <p className="mt-4 text-4xl font-semibold leading-tight">
            Sit your exams anywhere. Get your results in seconds.
          </p>
          <ul className="mt-8 space-y-3 text-white/85">
            <li className="flex items-center gap-3">
              <Check /> Timed exams that save every answer as you go
            </li>
            <li className="flex items-center gap-3">
              <Check /> Marked automatically the moment you hand in
            </li>
            <li className="flex items-center gap-3">
              <Check /> Every course and result in one place
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          Photo by{' '}
          <a
            href="https://unsplash.com/photos/pencil-on-multiple-choice-answer-sheet-cbEvoHbJnIE"
            className="underline underline-offset-2 hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            Nguyen Dang Hoang Nhu on Unsplash
          </a>
        </p>
      </aside>

      <main className="flex flex-col justify-center bg-sheet/95 px-6 py-12 backdrop-blur-sm sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <ServerWakeNotice />
          {beforeTitle}
          <h1 className="text-3xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-rule pt-6 text-sm text-ink-soft">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

function Check() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
        <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
