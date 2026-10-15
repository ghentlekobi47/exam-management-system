// First message for a field from an API validation error, e.g. fieldError(error, 'email')
export function fieldError(error, name) {
  return error?.details?.[name]?.[0]
}

// A general message for errors that aren't about one specific field
export function formError(error, fields) {
  if (!error) return null
  const hasFieldError = fields.some((name) => fieldError(error, name))
  return hasFieldError ? null : error.message
}
