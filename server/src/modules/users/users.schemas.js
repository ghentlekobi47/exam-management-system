const { z } = require('zod')
const { registerSchema } = require('../auth/auth.schemas')

const ROLES = ['admin', 'lecturer', 'student']

const createUserSchema = registerSchema.extend({
  role: z.enum(ROLES),
})

const updateUserSchema = z
  .object({
    fullName: registerSchema.shape.fullName,
    role: z.enum(ROLES),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to change')

const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
})

module.exports = { ROLES, createUserSchema, updateUserSchema, listUsersQuerySchema }
