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

const verifyEmailSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
})

const resendCodeSchema = z.object({ email })

const updateProfileSchema = z.object({
  fullName: registerSchema.shape.fullName,
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: registerSchema.shape.password,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Choose a password different from your current one',
    path: ['newPassword'],
  })

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendCodeSchema,
  updateProfileSchema,
  changePasswordSchema,
}
