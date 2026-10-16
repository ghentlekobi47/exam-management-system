const assert = require('node:assert/strict')
const { setTimeout: sleep } = require('node:timers/promises')
const { after, before, test } = require('node:test')
const { PASSWORD, startApi, makeUser, uniqueEmail, lastCodeFor } = require('./helpers')

let api

before(async () => {
  api = await startApi()
})

after(() => api.stop())

const login = (email, password, role) => api.call('POST', '/auth/login', { body: { email, password, role } })

test('a self-registered student must enter the emailed code before signing in', async () => {
  const email = uniqueEmail('signup')

  const registered = await api.call('POST', '/auth/register', {
    body: { fullName: 'New Student', email, password: PASSWORD },
  })
  assert.equal(registered.status, 201)
  assert.equal(registered.body.token, undefined, 'no sign-in before verifying')

  const early = await login(email, PASSWORD)
  assert.equal(early.status, 403)
  assert.equal(early.body.details.reason, 'email_not_verified')

  const code = lastCodeFor(email)
  assert.match(code, /^\d{6}$/)

  const wrong = await api.call('POST', '/auth/verify-email', {
    body: { email, code: code === '000000' ? '111111' : '000000' },
  })
  assert.equal(wrong.status, 400)

  const verified = await api.call('POST', '/auth/verify-email', { body: { email, code } })
  assert.equal(verified.status, 200)
  assert.ok(verified.body.token)

  assert.equal((await login(email, PASSWORD)).status, 200)
})

test('changing a password signs out other devices but keeps this one signed in', async () => {
  const user = await makeUser('lecturer', 'password-change')
  const otherDevice = (await login(user.email, PASSWORD)).body.token

  // Sign-in times are recorded in whole seconds, so let a second pass
  await sleep(1100)

  const changed = await api.call('POST', '/auth/change-password', {
    token: otherDevice,
    body: { currentPassword: PASSWORD, newPassword: 'BrandNewPass1!' },
  })
  assert.equal(changed.status, 200)

  assert.equal((await api.call('GET', '/auth/me', { token: otherDevice })).status, 401, 'old sign-in is rejected')
  assert.equal((await api.call('GET', '/auth/me', { token: changed.body.token })).status, 200, 'fresh token works')
  assert.equal((await login(user.email, PASSWORD)).status, 401, 'old password no longer works')
  assert.equal((await login(user.email, 'BrandNewPass1!')).status, 200)
})

test('a whole class can sign in from one network at the same time', async () => {
  const students = []
  for (let i = 0; i < 25; i++) students.push(await makeUser('student', `class-${i}`))

  const results = await Promise.all(students.map((s) => login(s.email, PASSWORD, 'student')))
  assert.deepEqual(
    results.map((r) => r.status),
    students.map(() => 200),
  )
})

test('wrong passwords are limited per account without locking out classmates', async () => {
  const victim = await makeUser('student', 'guessed')
  const classmate = await makeUser('student', 'classmate')

  const statuses = []
  for (let i = 0; i < 11; i++) statuses.push((await login(victim.email, 'WrongPassword!')).status)
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401))
  assert.equal(statuses[10], 429, 'the 11th wrong password in 15 minutes is blocked')

  assert.equal((await login(classmate.email, PASSWORD)).status, 200, 'another student on the same network still signs in')
})
