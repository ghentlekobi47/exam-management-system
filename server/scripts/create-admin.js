// Creates an admin account.
// Usage: npm run create-admin -- "Full Name" admin@example.com "StrongPassword"
const { registerSchema } = require('../src/modules/auth/auth.schemas')
const { createUser } = require('../src/modules/auth/auth.service')
const { sequelize } = require('../src/models')

async function main() {
  const [fullName, email, password] = process.argv.slice(2)
  const result = registerSchema.safeParse({ fullName, email, password })

  if (!result.success) {
    console.error('Usage: npm run create-admin -- "Full Name" admin@example.com "StrongPassword"')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exitCode = 1
    return
  }

  try {
    const admin = await createUser({ ...result.data, role: 'admin' })
    console.log(`Admin created: ${admin.fullName} <${admin.email}> (id ${admin.id})`)
  } catch (err) {
    console.error('Could not create admin:', err.message)
    process.exitCode = 1
  }
}

main().finally(() => sequelize.close())
