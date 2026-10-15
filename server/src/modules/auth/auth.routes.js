const express = require('express')
const { rateLimit } = require('express-rate-limit')
const validate = require('../../middleware/validate')
const authenticate = require('../../middleware/authenticate')
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

// Slows down password guessing and spam sign-ups
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
})

router.post('/register', authLimiter, validate(registerSchema), auth.register)
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), auth.verifyEmail)
router.post('/resend-code', authLimiter, validate(resendCodeSchema), auth.resendCode)
router.post('/login', authLimiter, validate(loginSchema), auth.login)

// The signed-in user's own profile
router.get('/me', authenticate, auth.me)
router.patch('/me', authenticate, validate(updateProfileSchema), auth.updateMe)
router.post('/change-password', authenticate, authLimiter, validate(changePasswordSchema), auth.changePassword)

module.exports = router
