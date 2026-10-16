const { ipKeyGenerator, rateLimit } = require('express-rate-limit')

// Limits are tuned for classrooms: a whole class often shares one school IP address,
// so successful sign-ins never count, and failures are counted per person, not per building.

const MINUTE = 60 * 1000

function limiter({ windowMs, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    message: { error: message },
  })
}

// "1.2.3.4|student@school.edu": one person on one network
const ipAndEmail = (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').trim().toLowerCase()}`

// Wrong passwords for one account: 10 per 15 minutes
const loginPerAccount = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: ipAndEmail,
  message: 'Too many wrong passwords for this account. Wait 15 minutes, then try again.',
})

// Wrong passwords from one network across many accounts (stops password-guessing sweeps)
const loginPerNetwork = limiter({
  windowMs: 15 * MINUTE,
  limit: 100,
  skipSuccessfulRequests: true,
  message: 'Too many failed sign-ins from this network. Wait 15 minutes, then try again.',
})

// New accounts from one network: enough for a whole class signing up together
const register = limiter({
  windowMs: 60 * MINUTE,
  limit: 50,
  message: 'Too many new accounts from this network. Try again in an hour.',
})

// Entering and resending email codes, per person
const emailCode = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: ipAndEmail,
  message: 'Too many attempts for this email. Wait 15 minutes, then try again.',
})

// Wrong current passwords when changing password, per signed-in user
const changePassword = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: 'Too many wrong passwords. Wait 15 minutes, then try again.',
})

module.exports = {
  login: [loginPerNetwork, loginPerAccount],
  register,
  emailCode,
  changePassword,
}
