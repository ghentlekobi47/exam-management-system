import { ButtonLink } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-bold text-marker">404</p>
      <h1 className="mt-4 text-3xl font-semibold">This page is not on the exam</h1>
      <p className="mt-2 text-ink-soft">The address may be wrong, or the page has moved.</p>
      <ButtonLink to="/" className="mt-8">
        Back to my courses
      </ButtonLink>
    </div>
  )
}
