const path = require('node:path')
const dotenv = require('dotenv')
const { z } = require('zod')

// ENV_FILE picks another settings file, e.g. .env.production to work on the hosted database
dotenv.config({ path: path.resolve(__dirname, '../..', process.env.ENV_FILE || '.env') })

const { resolveMailSettings } = require('./mailSettings')
const { parseOrigins, resolveDbSsl } = require('./deploySettings')

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  // The website address(es) allowed to call the API, separated by commas
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
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

function fail(message) {
  throw new Error(`Invalid server environment:\n${message}`)
}

if (!result.success) {
  fail(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'))
}

const clientOrigins = parseOrigins(result.data.CLIENT_ORIGIN)
for (const origin of clientOrigins) {
  if (!z.url().safeParse(origin).success) fail(`CLIENT_ORIGIN: "${origin}" is not a web address`)
}

// Email settings: SMTP (MAIL_HOST, MAIL_USER, MAIL_PASSWORD…) or Brevo's API (MAIL_TRANSPORT=brevo-api, BREVO_API_KEY)
const mail = resolveMailSettings(process.env)

if (!Number.isInteger(mail.port) || mail.port < 1 || mail.port > 65535) {
  fail('MAIL_PORT: must be a port number such as 587 or 465')
}
if (mail.from && !z.email().safeParse(mail.from).success) {
  fail('MAIL_FROM: must be an email address')
}
if (mail.transport === 'brevo-api' && mail.configured && !mail.from) {
  fail('MAIL_FROM: required with MAIL_TRANSPORT=brevo-api (a sender verified in Brevo)')
}
// In production, emails must really be sent; in development the code is printed instead
if (result.data.NODE_ENV === 'production' && !mail.configured) {
  fail(
    mail.transport === 'brevo-api'
      ? 'BREVO_API_KEY is required in production'
      : 'MAIL_USER and MAIL_PASSWORD are required in production',
  )
}

const dbSsl = resolveDbSsl(process.env)

module.exports = { ...result.data, clientOrigins, mail, dbSsl }
