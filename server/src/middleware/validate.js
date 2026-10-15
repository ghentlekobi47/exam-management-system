const { z } = require('zod')
const HttpError = require('../utils/httpError')

// Checks req.body (or req.params) against a zod schema and replaces it with the cleaned-up data
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {})

    if (!result.success) {
      throw new HttpError(400, 'Validation failed', z.flattenError(result.error).fieldErrors)
    }

    req[source] = result.data
    next()
  }
}

module.exports = validate
