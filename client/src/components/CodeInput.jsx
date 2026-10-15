import { useRef } from 'react'

// Six single-digit boxes for a verification code. Typing moves forward, Backspace moves back,
// and pasting the whole code fills every box.
export function CodeInput({ value, onChange, onComplete, disabled, invalid, length = 6 }) {
  const boxes = useRef([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function setDigits(next, focusIndex) {
    const code = next.join('').slice(0, length)
    onChange(code)
    if (focusIndex !== undefined) boxes.current[Math.min(focusIndex, length - 1)]?.focus()
    if (code.length === length && !next.includes('')) onComplete?.(code)
  }

  function handleInput(index, event) {
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) return

    // Several digits at once (paste or phone auto-fill) fill from this box onward
    const next = [...digits]
    typed.split('').forEach((digit, offset) => {
      if (index + offset < length) next[index + offset] = digit
    })
    setDigits(next, index + typed.length)
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        setDigits(next, index)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next, index - 1)
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      boxes.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      boxes.current[index + 1]?.focus()
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    event.preventDefault()
    setDigits(Array.from({ length }, (_, i) => pasted[i] ?? ''), pasted.length)
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el
          }}
          value={digit}
          onChange={(event) => handleInput(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid}
          autoFocus={index === 0}
          className={`h-14 w-full min-w-0 rounded-md border bg-sheet text-center font-mono text-2xl font-bold text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:opacity-60 sm:h-16 ${
            invalid ? 'border-marker' : digit ? 'border-ink/40' : 'border-rule'
          }`}
        />
      ))}
    </div>
  )
}
