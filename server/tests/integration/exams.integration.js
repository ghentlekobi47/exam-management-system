const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { models, startApi, makeUser, makeExam, publish, minutes } = require('./helpers')

let api
let admin, lecturer, otherLecturer, enrolled, outsider

before(async () => {
  api = await startApi()
  admin = await makeUser('admin')
  lecturer = await makeUser('lecturer')
  otherLecturer = await makeUser('lecturer', 'other-lecturer')
  enrolled = await makeUser('student', 'enrolled')
  outsider = await makeUser('student', 'outsider')
})

after(() => api.stop())

const answer = (attempt, question, optionIndex) =>
  api.call('PUT', `/attempts/${attempt.id}/answers`, {
    token: enrolled.token,
    body: { questionId: question.id, optionId: question.options[optionIndex].id },
  })

test('students only see published exams of their own courses, and never the answers', async () => {
  const { exam } = await makeExam(api.call, { admin, lecturer, students: [enrolled] })

  // A draft is invisible to students
  assert.equal((await api.call('GET', `/exams/${exam.id}`, { token: enrolled.token })).status, 404)

  await publish(api.call, lecturer, exam)

  const asEnrolled = await api.call('GET', `/exams/${exam.id}`, { token: enrolled.token })
  assert.equal(asEnrolled.status, 200)
  assert.equal(asEnrolled.body.exam.questions, undefined, 'students must not get the questions before starting')

  assert.equal((await api.call('GET', `/exams/${exam.id}`, { token: outsider.token })).status, 404)
  assert.equal((await api.call('GET', `/exams/${exam.id}`, { token: otherLecturer.token })).status, 404)

  const started = await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })
  assert.equal(started.status, 201)
  assert.equal(started.body.attempt.questions.length, 2)
  assert.equal(JSON.stringify(started.body).includes('isCorrect'), false, 'the attempt must not reveal correct answers')
})

test('handing in grades the answers and never shows students which were right', async () => {
  const { exam, q1, q2 } = await makeExam(api.call, { admin, lecturer, students: [enrolled] })
  await publish(api.call, lecturer, exam)

  const attempt = (await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })).body.attempt
  await answer(attempt, q1, 0) // True: right, 1 point
  await answer(attempt, q2, 2) // C: wrong (B is right)

  const result = (await api.call('POST', `/attempts/${attempt.id}/submit`, { token: enrolled.token })).body.result
  assert.equal(result.score, 1)
  assert.equal(result.totalPoints, 3)
  assert.equal(result.percentage, 33.33)
  assert.equal(result.passed, false)

  const studentView = (await api.call('GET', `/attempts/${attempt.id}`, { token: enrolled.token })).body.attempt
  assert.equal(studentView.questions, undefined, 'students only see their score')

  const lecturerView = (await api.call('GET', `/attempts/${attempt.id}`, { token: lecturer.token })).body.attempt
  assert.deepEqual(
    lecturerView.questions.map((q) => [q.isCorrect, q.pointsAwarded]),
    [
      [true, 1],
      [false, 0],
    ],
  )
})

test('students cannot go over the allowed number of attempts', async () => {
  const { exam } = await makeExam(api.call, { admin, lecturer, students: [enrolled], examFields: { maxAttempts: 1 } })
  await publish(api.call, lecturer, exam)

  const first = (await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })).body.attempt
  const resumed = await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })
  assert.equal(resumed.status, 200, 'starting again resumes the open attempt')
  assert.equal(resumed.body.attempt.id, first.id)

  await api.call('POST', `/attempts/${first.id}/submit`, { token: enrolled.token })
  const again = await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })
  assert.equal(again.status, 409)
})

test('when time runs out, answers are refused and the attempt is handed in automatically', async () => {
  const { exam, q1, q2 } = await makeExam(api.call, { admin, lecturer, students: [enrolled] })
  await publish(api.call, lecturer, exam)

  const attempt = (await api.call('POST', `/exams/${exam.id}/attempts`, { token: enrolled.token })).body.attempt
  await answer(attempt, q1, 0) // saved in time

  // Pretend the attempt started 11 minutes ago (the time limit is 10)
  await models.ExamAttempt.update({ startedAt: new Date(Date.now() - minutes(11)) }, { where: { id: attempt.id } })

  const late = await answer(attempt, q2, 1)
  assert.equal(late.status, 409)

  const result = (await api.call('GET', `/attempts/${attempt.id}`, { token: enrolled.token })).body.attempt
  assert.equal(result.status, 'expired')
  assert.equal(result.score, 1, 'only the answer saved in time counts')
})

test('a lecturer cannot manage another lecturer\'s course or exam', async () => {
  const { course, exam } = await makeExam(api.call, { admin, lecturer, students: [] })

  const addQuestion = await api.call('POST', `/exams/${exam.id}/questions`, {
    token: otherLecturer.token,
    body: { type: 'true_false', text: 'Sneaky', correctAnswer: true },
  })
  assert.equal(addQuestion.status, 404)

  const enroll = await api.call('POST', `/courses/${course.id}/students`, {
    token: otherLecturer.token,
    body: { email: outsider.email },
  })
  assert.equal(enroll.status, 404)
})
