const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { UniqueConstraintError } = require('sequelize')
const env = require('../../config/env')
const { User } = require('../../models')
const HttpError = require('../../utils/httpError')

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

async function createUser({ fullName, email, password, role }) {
  if (await User.findOne({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists')
  }

  try {
    const user = await User.create({
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role,
    })
    return toPublicUser(user)
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new HttpError(409, 'An account with this email already exists')
    }
    throw err
  }
}

// Public sign-up always creates a student
function registerStudent({ fullName, email, password }) {
  return createUser({ fullName, email, password, role: 'student' })
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

  return { user: toPublicUser(user), token: signToken(user) }
}

module.exports = { createUser, registerStudent, login, signToken }
