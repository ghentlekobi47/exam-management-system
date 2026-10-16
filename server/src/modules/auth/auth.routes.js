const express = require('express')
const validate = require('../../middleware/validate')
const authenticate = require('../../middleware/authenticate')
const limits = require('../../middleware/rateLimits')
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendCodeSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('./auth.schemas')
const auth = require('./auth.controller')

const router = express.Router()

router.post('/register', limits.register, validate(registerSchema), auth.register)
router.post('/verify-email', limits.emailCode, validate(verifyEmailSchema), auth.verifyEmail)
router.post('/resend-code', limits.emailCode, validate(resendCodeSchema), auth.resendCode)
router.post('/login', limits.login, validate(loginSchema), auth.login)

// The signed-in user's own profile
router.get('/me', authenticate, auth.me)
router.patch('/me', authenticate, validate(updateProfileSchema), auth.updateMe)
router.post(
  '/change-password',
  authenticate,
  limits.changePassword,
  validate(changePasswordSchema),
  auth.changePassword,
)

module.exports = router
