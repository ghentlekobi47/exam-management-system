// A slightly rotated rubber stamp: PASSED or NOT PASSED
export function Stamp({ passed }) {
  const tone = passed ? 'text-pass border-pass' : 'text-marker border-marker'

  return (
    <span
      className={`inline-block -rotate-6 rounded border-[3px] px-4 py-1.5 font-mono text-lg font-bold uppercase tracking-[0.2em] opacity-90 ${tone}`}
      style={{ boxShadow: 'inset 0 0 0 2px currentColor' }}
    >
      {passed ? 'Passed' : 'Not passed'}
    </span>
  )
}
