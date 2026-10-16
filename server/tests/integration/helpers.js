// Shared setup for the database tests. Run them with: npm run test:integration

// Catch verification codes instead of emailing them (must happen before the app loads)
const mailer = require('../../src/services/mailer')

const sentCodes = []
mailer.sendVerificationCode = async ({ to, code }) => {
  sentCodes.push({ to, code })
}

const app = require('../../src/app')
const models = require('../../src/models')
const { createUser, signToken } = require('../../src/modules/auth/auth.service')

const PASSWORD = 'Password123!'
let counter = 0

function uniqueEmail(label) {
  counter += 1
  return `${label}-${Date.now()}-${counter}@example.com`
}

function lastCodeFor(email) {
  return sentCodes.filter((sent) => sent.to === email).at(-1)?.code
}

// Starts the API on a free port and returns a small client for it
async function startApi() {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`

  async function call(method, path, { token, body } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve))
    await models.sequelize.close()
  }

  return { call, stop }
}

// Creates a verified user directly in the database and signs them in
async function makeUser(role, label = role) {
  const email = uniqueEmail(label)
  const user = await createUser({ fullName: `Test ${label}`, email, password: PASSWORD, role })
  return { ...user, password: PASSWORD, token: signToken(user) }
}

const minutes = (n) => n * 60 * 1000
const isoFromNow = (ms) => new Date(Date.now() + ms).toISOString()

// A course taught by a lecturer, with enrolled students and a draft exam (publish it with publish()):
// Q1 true/false (1 pt, answer True), Q2 multiple choice (2 pts, answer B)
async function makeExam(call, { admin, lecturer, students, examFields = {} }) {
  const course = (
    await call('POST', '/courses', {
      token: admin.token,
      body: { code: `T${Date.now() % 1e6}${counter}`, title: 'Test course', lecturerId: lecturer.id },
    })
  ).body.course

  for (const student of students) {
    await call('POST', `/courses/${course.id}/students`, { token: lecturer.token, body: { email: student.email } })
  }

  const exam = (
    await call('POST', `/courses/${course.id}/exams`, {
      token: lecturer.token,
      body: {
        title: 'Test exam',
        durationMinutes: 10,
        startAt: isoFromNow(-minutes(1)),
        endAt: isoFromNow(minutes(60)),
        maxAttempts: 1,
        passMark: 50,
        ...examFields,
      },
    })
  ).body.exam

  const q1 = (
    await call('POST', `/exams/${exam.id}/questions`, {
      token: lecturer.token,
      body: { type: 'true_false', text: 'Q1', correctAnswer: true },
    })
  ).body.question
  const q2 = (
    await call('POST', `/exams/${exam.id}/questions`, {
      token: lecturer.token,
      body: {
        type: 'multiple_choice',
        text: 'Q2',
        points: 2,
        options: [{ text: 'A' }, { text: 'B', isCorrect: true }, { text: 'C' }],
      },
    })
  ).body.question

  return { course, exam, q1, q2 }
}

async function publish(call, lecturer, exam) {
  return call('POST', `/exams/${exam.id}/publish`, { token: lecturer.token })
}

module.exports = {
  PASSWORD,
  models,
  startApi,
  makeUser,
  makeExam,
  publish,
  uniqueEmail,
  lastCodeFor,
  minutes,
  isoFromNow,
}
