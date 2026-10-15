// First message for a field from an API validation error, e.g. fieldError(error, 'email')
export function fieldError(error, name) {
  return error?.details?.[name]?.[0]
}

// What to show next to a form's Save button when it can't be saved
export function summaryMessage(error, fields, hasLocalErrors = false) {
  if (!error && !hasLocalErrors) return null
  return formError(error, fields) ?? 'Please fix the highlighted fields above.'
}

// Scrolls to the first field marked invalid and puts the cursor in it.
// Runs after React has drawn the error messages.
export function focusFirstInvalid(form) {
  setTimeout(() => {
    const field = form?.querySelector('[aria-invalid="true"]')
    if (!field) return
    field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    field.focus({ preventScroll: true })
  }, 0)
}

// A general message for errors that aren't about one specific field
export function formError(error, fields) {
  if (!error) return null
  const hasFieldError = fields.some((name) => fieldError(error, name))
  return hasFieldError ? null : error.message
}
