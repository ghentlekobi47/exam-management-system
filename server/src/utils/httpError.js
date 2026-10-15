// An error with an HTTP status code; errorHandler turns it into a JSON response
class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

module.exports = HttpError
