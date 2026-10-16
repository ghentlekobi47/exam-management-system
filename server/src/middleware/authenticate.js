const jwt = require('jsonwebtoken')
const env = require('../config/env')
const { User } = require('../models')
const HttpError = require('../utils/httpError')

// Requires a valid "Authorization: Bearer <token>" header and sets req.user
async function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Authentication required')
  }

  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET)
  } catch {
    throw new HttpError(401, 'Invalid or expired token')
  }

  const user = await User.findByPk(payload.sub)

  if (!user || !user.isActive) {
    throw new HttpError(401, 'Invalid or expired token')
  }

  // After a password change, older sign-ins on other devices stop working.
  // Tokens record their time in whole seconds, so compare in seconds.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new HttpError(401, 'Your password was changed. Please sign in again.')
  }

  req.user = user
  next()
}

module.exports = authenticate
