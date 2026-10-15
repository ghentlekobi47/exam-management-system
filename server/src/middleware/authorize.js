const HttpError = require('../utils/httpError')

// Use after authenticate, e.g. authorize('admin') or authorize('admin', 'lecturer')
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to do this')
    }

    next()
  }
}

module.exports = authorize
