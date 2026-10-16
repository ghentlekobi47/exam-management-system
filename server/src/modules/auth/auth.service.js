const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { UniqueConstraintError } = require('sequelize')
const env = require('../../config/env')
const { User } = require('../../models')
const HttpError = require('../../utils/httpError')
const emailVerification = require('./emailVerification')

const SALT_ROUNDS = 12

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

function signToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

// Removes the password hash before a user is sent to the client
function toPublicUser(user) {
  const { passwordHash: _passwordHash, ...publicUser } = user.toJSON()
  return publicUser
}

// Accounts an admin creates count as verified; self sign-ups verify by email first
async function createUser({ fullName, email, password, role }, { verified = true } = {}) {
  if (await User.findOne({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists')
  }

  try {
    const user = await User.create({
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role,
      emailVerifiedAt: verified ? new Date() : null,
    })
    return toPublicUser(user)
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new HttpError(409, 'An account with this email already exists')
    }
    throw err
  }
}

// Public sign-up always creates a student, who must enter the emailed code before signing in
async function registerStudent({ fullName, email, password }) {
  const created = await createUser({ fullName, email, password, role: 'student' }, { verified: false })
  const user = await User.findByPk(created.id)
  const emailSent = await emailVerification.sendNewCode(user)
  return { email: user.email, emailSent }
}

async function verifyEmail({ email, code }) {
  const user = await User.findOne({ where: { email } })

  if (!user || !user.isActive) {
    throw new HttpError(400, 'That code isn\'t right. Request a new code and try again.')
  }
  // Never hand out a token without checking a code: verified accounts sign in with their password
  if (user.emailVerifiedAt) {
    throw new HttpError(400, 'This email is already verified. Sign in with your password.')
  }

  await emailVerification.checkCode(user, code)
  return { user: toPublicUser(user), token: signToken(user) }
}

// Always the same answer, so this can't be used to find out which emails have accounts
async function resendCode({ email }) {
  const user = await User.findOne({ where: { email } })
  if (user && user.isActive && !user.emailVerifiedAt) {
    await emailVerification.sendCodeIfAllowed(user)
  }
}

const roleNames = { admin: 'an admin', lecturer: 'a lecturer', student: 'a student' }
const tabNames = { admin: 'Admin', lecturer: 'Lecturer', student: 'Student' }

async function login({ email, password, role }) {
  const user = await User.scope('withPassword').findOne({ where: { email } })
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash))

  // Same message for unknown email and wrong password, so emails can't be guessed
  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password')
  }

  if (!user.isActive) {
    throw new HttpError(403, 'This account has been deactivated')
  }

  // Only checked after the password is right, so the tabs can't reveal who has which role
  if (role && role !== user.role) {
    throw new HttpError(
      403,
      `This is ${roleNames[user.role]} account. Use the ${tabNames[user.role]} tab to sign in.`,
    )
  }

  // The password is right but the email isn't verified yet: send a fresh code and say so
  if (!user.emailVerifiedAt) {
    await emailVerification.sendCodeIfAllowed(user)
    throw new HttpError(403, 'Please verify your email first. We\'ve sent you a code.', {
      reason: 'email_not_verified',
      email: user.email,
    })
  }

  return { user: toPublicUser(user), token: signToken(user) }
}

async function updateProfile(user, { fullName }) {
  await user.update({ fullName })
  return toPublicUser(user)
}

async function changePassword(user, { currentPassword, newPassword }) {
  const withPassword = await User.scope('withPassword').findByPk(user.id)

  // 400, not 401: a wrong current password shouldn't sign the user out
  if (!(await bcrypt.compare(currentPassword, withPassword.passwordHash))) {
    throw new HttpError(400, 'Your current password is wrong', {
      currentPassword: ['Your current password is wrong'],
    })
  }

  // Recording the time signs out every other device; this device gets a fresh token.
  // Whole seconds, because MySQL would round 12:00:12.7 up to 12:00:13 and reject the fresh token.
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
  await withPassword.update({ passwordHash: await hashPassword(newPassword), passwordChangedAt: changedAt })
  await user.reload()
  return { user: toPublicUser(user), token: signToken(user) }
}

module.exports = {
  createUser,
  registerStudent,
  verifyEmail,
  resendCode,
  login,
  signToken,
  updateProfile,
  changePassword,
  hashPassword,
}
