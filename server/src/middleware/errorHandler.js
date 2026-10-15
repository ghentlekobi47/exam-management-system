const {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} = require('sequelize')

// Turns database rule violations into clear 4xx errors instead of a generic 500
function fromDatabaseError(err) {
  if (err instanceof UniqueConstraintError) {
    return { status: 409, message: 'A record with this value already exists' }
  }
  if (err instanceof ValidationError) {
    return { status: 400, message: err.errors.map((e) => e.message).join(', ') }
  }
  if (err instanceof ForeignKeyConstraintError) {
    return { status: 409, message: 'This record is linked to other data and cannot be changed' }
  }
  return null
}

function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  const dbError = fromDatabaseError(err)
  const rawStatus = dbError?.status ?? err.status ?? err.statusCode
  const status = Number.isInteger(rawStatus) ? rawStatus : 500

  if (status >= 500) {
    console.error(err)
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : (dbError?.message ?? err.message),
    ...(status < 500 && err.details ? { details: err.details } : {}),
  })
}

module.exports = errorHandler
