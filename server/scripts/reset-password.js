// Sets a new password for an existing account (e.g. a forgotten admin password).
// Usage: npm run reset-password -- admin@example.com "NewStrongPassword"
const { registerSchema } = require('../src/modules/auth/auth.schemas')
const { hashPassword } = require('../src/modules/auth/auth.service')
const { User, sequelize } = require('../src/models')

const resetSchema = registerSchema.pick({ email: true, password: true })

async function main() {
  const [email, password] = process.argv.slice(2)
  const result = resetSchema.safeParse({ email, password })

  if (!result.success) {
    console.error('Usage: npm run reset-password -- admin@example.com "NewStrongPassword"')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exitCode = 1
    return
  }

  try {
    const user = await User.findOne({ where: { email: result.data.email } })
    if (!user) {
      console.error(`Could not reset password: no account with the email ${result.data.email}`)
      process.exitCode = 1
      return
    }

    // Recording the time signs out every device that used the old password (whole seconds, see changePassword)
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
    await user.update({ passwordHash: await hashPassword(result.data.password), passwordChangedAt: changedAt })
    console.log(`Password reset for ${user.fullName} <${user.email}> (${user.role})`)
  } catch (err) {
    console.error('Could not reset password:', err.message)
    process.exitCode = 1
  }
}

main().finally(() => sequelize.close())
