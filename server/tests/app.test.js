const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const app = require('../src/app')

let server
let baseUrl

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
})

test('GET /api/health returns a healthy status and timestamp', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false)
})

test('unknown routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/not-a-route`)
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Not Found')
})

test('register rejects an invalid body with field details', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'A', email: 'not-an-email', password: 'short' }),
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Validation failed')
  assert.ok(body.details.fullName)
  assert.ok(body.details.email)
  assert.ok(body.details.password)
})

test('login requires a password', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com' }),
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.ok(body.details.password)
})

test('login rejects an unknown role tab', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com', password: 'whatever', role: 'principal' }),
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.ok(body.details.role)
})

test('verify-email needs a 6-digit code and resend-code needs an email', async () => {
  const post = (path, body) =>
    fetch(`${baseUrl}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const shortCode = await post('verify-email', { email: 'student@example.com', code: '12345' })
  const letters = await post('verify-email', { email: 'student@example.com', code: 'abcdef' })
  const badEmail = await post('resend-code', { email: 'not-an-email' })

  assert.equal(shortCode.status, 400)
  assert.ok((await shortCode.json()).details.code)
  assert.equal(letters.status, 400)
  assert.equal(badEmail.status, 400)
})

test('GET /api/auth/me without a token returns 401', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`)

  assert.equal(response.status, 401)
})

test('GET /api/auth/me with an invalid token returns 401', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer not-a-real-token' },
  })

  assert.equal(response.status, 401)
})

test('course and user routes require a token', async () => {
  const courses = await fetch(`${baseUrl}/api/courses`)
  const users = await fetch(`${baseUrl}/api/users`)

  assert.equal(courses.status, 401)
  assert.equal(users.status, 401)
})

test('creating a course with an invalid token returns 401', async () => {
  const response = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
    body: JSON.stringify({ code: 'CS101', title: 'Intro', lecturerId: 1 }),
  })

  assert.equal(response.status, 401)
})

test('exam routes require a token', async () => {
  const exam = await fetch(`${baseUrl}/api/exams/1`)
  const courseExams = await fetch(`${baseUrl}/api/courses/1/exams`)

  assert.equal(exam.status, 401)
  assert.equal(courseExams.status, 401)
})

test('attempt routes require a token', async () => {
  const start = await fetch(`${baseUrl}/api/exams/1/attempts`, { method: 'POST' })
  const attempt = await fetch(`${baseUrl}/api/attempts/1`)

  assert.equal(start.status, 401)
  assert.equal(attempt.status, 401)
})

test('results routes require a token', async () => {
  const mine = await fetch(`${baseUrl}/api/attempts`)
  const csv = await fetch(`${baseUrl}/api/exams/1/results.csv`)

  assert.equal(mine.status, 401)
  assert.equal(csv.status, 401)
})

test('malformed JSON bodies return a JSON 400', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"broken":',
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(typeof body.error, 'string')
})
