const assert = require('node:assert/strict')
const { test } = require('node:test')
const { generateCode, hashCode, codeMatches } = require('../src/modules/auth/emailVerification')

test('codes are always 6 digits', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateCode(), /^\d{6}$/)
  }
})

test('only the right code matches its stored hash', () => {
  const stored = hashCode('048213')

  assert.equal(codeMatches('048213', stored), true)
  assert.equal(codeMatches('048214', stored), false)
  assert.equal(codeMatches('48213', stored), false)
})

test('the stored hash does not contain the code', () => {
  const stored = hashCode('123456')

  assert.equal(stored.includes('123456'), false)
  assert.equal(stored.length, 64)
})
