const crypto = require('node:crypto')
const env = require('../../config/env')
const { EmailVerificationCode } = require('../../models')
const { sendVerificationCode } = require('../../services/mailer')
const HttpError = require('../../utils/httpError')

const CODE_LIFETIME_MINUTES = 15
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000

// Six random digits, e.g. "048213"
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

// Only this keyed hash is stored, so a database leak doesn't reveal the codes
function hashCode(code) {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(code).digest('hex')
}

function codeMatches(code, storedHash) {
  const given = Buffer.from(hashCode(code), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  return given.length === stored.length && crypto.timingSafeEqual(given, stored)
}

// Creates a fresh code (replacing any old one) and emails it. Returns false if the email failed.
async function sendNewCode(user) {
  const code = generateCode()
  const now = new Date()

  await EmailVerificationCode.upsert({
    userId: user.id,
    codeHash: hashCode(code),
    expiresAt: new Date(now.getTime() + CODE_LIFETIME_MINUTES * 60 * 1000),
    attempts: 0,
    lastSentAt: now,
  })

  try {
    await sendVerificationCode({
      to: user.email,
      name: user.fullName,
      code,
      expiresInMinutes: CODE_LIFETIME_MINUTES,
    })
    return true
  } catch (err) {
    console.error(`[mail] Could not send the verification email to ${user.email}:`, err.message)
    return false
  }
}

// Sends a new code unless one went out less than a minute ago
async function sendCodeIfAllowed(user) {
  const current = await EmailVerificationCode.findOne({ where: { userId: user.id } })
  if (current && Date.now() - current.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return false
  }
  return sendNewCode(user)
}

// Checks a code. On success marks the user verified; otherwise explains what went wrong.
async function checkCode(user, code) {
  const record = await EmailVerificationCode.findOne({ where: { userId: user.id } })
  const askForNew = 'Request a new code and try again.'

  if (!record) {
    throw new HttpError(400, `There is no active code for this account. ${askForNew}`)
  }
  if (record.expiresAt < new Date()) {
    throw new HttpError(400, `That code has expired. ${askForNew}`)
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(400, `Too many wrong codes. ${askForNew}`)
  }

  if (!codeMatches(code, record.codeHash)) {
    await record.increment('attempts')
    const left = MAX_ATTEMPTS - record.attempts - 1
    throw new HttpError(
      400,
      left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : `That code isn't right. ${askForNew}`,
    )
  }

  await user.update({ emailVerifiedAt: new Date() })
  await record.destroy()
}

module.exports = {
  generateCode,
  hashCode,
  codeMatches,
  sendNewCode,
  sendCodeIfAllowed,
  checkCode,
  CODE_LIFETIME_MINUTES,
}
