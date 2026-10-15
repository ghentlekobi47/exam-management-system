const path = require('node:path')
const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const { resolveMailSettings } = require('./mailSettings')

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_NAME: z.string().min(1).default('campusiq'),
    DB_USER: z.string().min(1).default('root'),
    DB_PASSWORD: z.string().default(''),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  })

const result = envSchema.safeParse(process.env)

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(`Invalid server environment:\n${details}`)
}

// Email (SMTP) settings: MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASSWORD, MAIL_FROM, MAIL_FROM_NAME
const mail = resolveMailSettings(process.env)

if (!Number.isInteger(mail.port) || mail.port < 1 || mail.port > 65535) {
  throw new Error('Invalid server environment:\nMAIL_PORT: must be a port number such as 587 or 465')
}
if (mail.from && !z.email().safeParse(mail.from).success) {
  throw new Error('Invalid server environment:\nMAIL_FROM: must be an email address')
}
// In production, emails must really be sent; in development the code is printed instead
if (result.data.NODE_ENV === 'production' && !mail.configured) {
  throw new Error('Invalid server environment:\nMAIL_USER and MAIL_PASSWORD are required in production')
}

module.exports = { ...result.data, mail }
