const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { startApi, makeUser, makeExam, publish } = require('./helpers')

let api
let admin, lecturer, student

before(async () => {
  api = await startApi()
  admin = await makeUser('admin')
  lecturer = await makeUser('lecturer')
  student = await makeUser('student', 'chooser')
})

after(() => api.stop())

let codeCounter = 0
async function makeCourse() {
  codeCounter += 1
  const { body } = await api.call('POST', '/courses', {
    token: admin.token,
    body: { code: `S${Date.now() % 1e6}${codeCounter}`, title: 'Open course' },
  })
  return body.course
}

const findIn = (courses, course) => courses.find((c) => c.id === course.id)

test('students browse all courses and join the ones they choose', async () => {
  const course = await makeCourse()

  const before = await api.call('GET', '/courses/catalog', { token: student.token })
  assert.equal(before.status, 200)
  assert.equal(findIn(before.body.courses, course).enrolled, false)

  const joined = await api.call('POST', `/courses/${course.id}/enroll`, { token: student.token })
  assert.equal(joined.status, 201)

  const catalog = await api.call('GET', '/courses/catalog', { token: student.token })
  assert.equal(findIn(catalog.body.courses, course).enrolled, true)

  const mine = await api.call('GET', '/courses', { token: student.token })
  assert.ok(findIn(mine.body.courses, course), 'the joined course is on the dashboard')

  const again = await api.call('POST', `/courses/${course.id}/enroll`, { token: student.token })
  assert.equal(again.status, 409)

  const missing = await api.call('POST', '/courses/999999999/enroll', { token: student.token })
  assert.equal(missing.status, 404)
})

test('students can drop a course until they start an exam in it', async () => {
  const course = await makeCourse()
  await api.call('POST', `/courses/${course.id}/enroll`, { token: student.token })

  const dropped = await api.call('DELETE', `/courses/${course.id}/enroll`, { token: student.token })
  assert.equal(dropped.status, 204)
  const notEnrolled = await api.call('DELETE', `/courses/${course.id}/enroll`, { token: student.token })
  assert.equal(notEnrolled.status, 404)

  const { course: examCourse, exam } = await makeExam(api.call, { admin, lecturer, students: [student] })
  await publish(api.call, lecturer, exam)
  await api.call('POST', `/exams/${exam.id}/attempts`, { token: student.token })

  const refused = await api.call('DELETE', `/courses/${examCourse.id}/enroll`, { token: student.token })
  assert.equal(refused.status, 409)
})

test('only students use the course catalog', async () => {
  const course = await makeCourse()

  for (const user of [admin, lecturer]) {
    assert.equal((await api.call('GET', '/courses/catalog', { token: user.token })).status, 403)
    assert.equal((await api.call('POST', `/courses/${course.id}/enroll`, { token: user.token })).status, 403)
  }
})
