const authService = require('./auth.service')

// Creates the account and emails a code; the student signs in once they verify
async function register(req, res) {
  const { email, emailSent } = await authService.registerStudent(req.body)
  res.status(201).json({ needsVerification: true, email, emailSent })
}

async function verifyEmail(req, res) {
  const { user, token } = await authService.verifyEmail(req.body)
  res.status(200).json({ user, token })
}

async function resendCode(req, res) {
  await authService.resendCode(req.body)
  res.status(200).json({ message: 'If this account still needs verifying, we\'ve sent a new code.' })
}

async function login(req, res) {
  const { user, token } = await authService.login(req.body)
  res.status(200).json({ user, token })
}

function me(req, res) {
  res.status(200).json({ user: req.user })
}

module.exports = { register, verifyEmail, resendCode, login, me }
