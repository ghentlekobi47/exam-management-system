const express = require('express')
const { rateLimit } = require('express-rate-limit')
const validate = require('../../middleware/validate')
const authenticate = require('../../middleware/authenticate')
const { registerSchema, loginSchema, verifyEmailSchema, resendCodeSchema } = require('./auth.schemas')
const { register, verifyEmail, resendCode, login, me } = require('./auth.controller')

const router = express.Router()

// Slows down password guessing and spam sign-ups
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
})

router.post('/register', authLimiter, validate(registerSchema), register)
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail)
router.post('/resend-code', authLimiter, validate(resendCodeSchema), resendCode)
router.post('/login', authLimiter, validate(loginSchema), login)
router.get('/me', authenticate, me)

module.exports = router
