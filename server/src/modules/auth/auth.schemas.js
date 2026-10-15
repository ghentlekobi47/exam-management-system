const { z } = require('zod')

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is too short').max(150),
  email,
  // bcrypt only uses the first 72 bytes of a password
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
})

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  // The login page tab the user signed in from (optional)
  role: z.enum(['admin', 'lecturer', 'student']).optional(),
})

module.exports = { registerSchema, loginSchema }
