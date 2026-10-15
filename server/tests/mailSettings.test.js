const assert = require('node:assert/strict')
const { test } = require('node:test')
const { resolveMailSettings, textToBoolean } = require('../src/config/mailSettings')

test('"false" in .env really means false', () => {
  assert.equal(textToBoolean('false', true), false)
  assert.equal(textToBoolean('TRUE', false), true)
  assert.equal(textToBoolean('', true), true)
  assert.equal(textToBoolean(undefined, false), false)
})

test('Brevo is the default provider', () => {
  const mail = resolveMailSettings({
    MAIL_USER: '8a1b2c001@smtp-brevo.com',
    MAIL_PASSWORD: 'xsmtpsib-key',
    MAIL_FROM: 'noreply@campusiq.test',
  })

  assert.deepEqual(
    { host: mail.host, port: mail.port, secure: mail.secure, from: mail.from, configured: mail.configured },
    { host: 'smtp-relay.brevo.com', port: 587, secure: false, from: 'noreply@campusiq.test', configured: true },
  )
})

test('an older Gmail-only setup keeps working', () => {
  const mail = resolveMailSettings({ MAIL_USER: 'me@gmail.com', MAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' })

  assert.equal(mail.host, 'smtp.gmail.com')
  assert.equal(mail.port, 465)
  assert.equal(mail.secure, true)
  assert.equal(mail.password, 'abcdefghijklmnop')
  assert.equal(mail.from, 'me@gmail.com')
})

test('no login means codes are printed instead of emailed', () => {
  assert.equal(resolveMailSettings({}).configured, false)
})
