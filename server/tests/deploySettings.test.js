const assert = require('node:assert/strict')
const { test } = require('node:test')
const { parseOrigins, resolveDbSsl } = require('../src/config/deploySettings')
const { resolveMailSettings } = require('../src/config/mailSettings')

const CERT = '-----BEGIN CERTIFICATE-----\nMIIabc\n-----END CERTIFICATE-----'

test('CLIENT_ORIGIN can list several websites', () => {
  assert.deepEqual(parseOrigins('https://campusiq.vercel.app/, http://localhost:5173'), [
    'https://campusiq.vercel.app',
    'http://localhost:5173',
  ])
})

test('database SSL is off unless DB_SSL=true', () => {
  assert.equal(resolveDbSsl({}), null)
  assert.equal(resolveDbSsl({ DB_SSL: 'false', DB_SSL_CA: CERT }), null)
})

test('a pasted CA certificate turns on verified SSL, with \\n escapes restored', () => {
  const ssl = resolveDbSsl({ DB_SSL: 'true', DB_SSL_CA: CERT.replace(/\n/g, '\\n') })

  assert.equal(ssl.rejectUnauthorized, true)
  assert.equal(ssl.ca, CERT)
})

test('a broken certificate is reported clearly', () => {
  assert.throws(() => resolveDbSsl({ DB_SSL: 'true', DB_SSL_CA: 'not a certificate' }), /BEGIN\/END CERTIFICATE/)
})

test('MAIL_TRANSPORT=brevo-api uses the API key instead of SMTP', () => {
  const mail = resolveMailSettings({
    MAIL_TRANSPORT: 'brevo-api',
    BREVO_API_KEY: 'xkeysib-abc',
    MAIL_FROM: 'sender@example.com',
  })

  assert.equal(mail.transport, 'brevo-api')
  assert.equal(mail.configured, true)
  assert.equal(mail.from, 'sender@example.com')
  assert.equal(resolveMailSettings({ MAIL_TRANSPORT: 'brevo-api' }).configured, false)
})
