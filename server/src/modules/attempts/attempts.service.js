const { Op } = require('sequelize')
const {
  sequelize,
  AttemptAnswer,
  Enrollment,
  Exam,
  ExamAttempt,
  Question,
  QuestionOption,
} = require('../../models')
const HttpError = require('../../utils/httpError')
const { findExamForUser } = require('../exams/exams.service')

// ---------- Time limits ----------

// An attempt ends after the exam's duration, but never later than the exam's end time
function deadlineOf(attempt, exam) {
  const byDuration = attempt.startedAt.getTime() + exam.durationMinutes * 60 * 1000
  return new Date(Math.min(byDuration, exam.endAt.getTime()))
}

// Time is up once the deadline passes or the lecturer closes the exam
function isTimeUp(attempt, exam) {
  return exam.status !== 'published' || Date.now() >= deadlineOf(attempt, exam).getTime()
}

// ---------- Grading ----------

function loadQuestions(examId, transaction) {
  return Question.findAll({
    where: { examId },
    include: [{ association: 'options' }],
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
      [{ model: QuestionOption, as: 'options' }, 'position', 'ASC'],
    ],
    transaction,
  })
}

// Grades the saved answers and closes the attempt. Safe to call twice:
// the row lock and status check stop an attempt being graded twice.
async function finalizeAttempt(attemptId, exam, status) {
  await sequelize.transaction(async (transaction) => {
    const attempt = await ExamAttempt.findByPk(attemptId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (attempt.status !== 'in_progress') return

    const questions = await loadQuestions(exam.id, transaction)
    const answers = await AttemptAnswer.findAll({ where: { attemptId }, transaction })
    let score = 0

    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId)
      const correctOption = question?.options.find((o) => o.isCorrect)
      const isCorrect = Boolean(correctOption) && answer.selectedOptionId === correctOption.id
      const pointsAwarded = isCorrect ? question.points : 0

      score += pointsAwarded
      await answer.update({ isCorrect, pointsAwarded }, { transaction })
    }

    const deadline = deadlineOf(attempt, exam)
    const submittedAt = status === 'expired' && deadline < new Date() ? deadline : new Date()
    await attempt.update({ status, score, submittedAt }, { transaction })
  })
}

// Attempts left open past their deadline are submitted automatically
// the next time anyone looks at them, so no background job is needed
async function expireIfTimeUp(attempt, exam) {
  if (attempt.status === 'in_progress' && isTimeUp(attempt, exam)) {
    await finalizeAttempt(attempt.id, exam, 'expired')
    await attempt.reload()
  }
}

// ---------- What students and staff see ----------

// Shuffles the same way every time for the same attempt, so a resumed attempt keeps its order
function seededShuffle(items, seed) {
  const shuffled = [...items]
  let state = seed

  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// The exam as the student sees it while answering: no correct answers
async function inProgressView(attempt, exam) {
  const questions = await loadQuestions(exam.id)
  const answers = await AttemptAnswer.findAll({ where: { attemptId: attempt.id } })
  const deadline = deadlineOf(attempt, exam)
  const ordered = exam.shuffleQuestions ? seededShuffle(questions, attempt.id) : questions

  return {
    id: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    instructions: exam.instructions,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadline,
    remainingSeconds: Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000)),
    questions: ordered.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.points,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
    answers: answers.map((a) => ({ questionId: a.questionId, selectedOptionId: a.selectedOptionId })),
  }
}

async function examTotalPoints(examId) {
  return Number((await Question.sum('points', { where: { examId } })) ?? 0)
}

// Score summary. Students only ever see this, never which answers were right.
function resultView(attempt, exam, totalPoints) {
  const score = attempt.score ?? 0
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 10000) / 100 : 0

  return {
    id: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score,
    totalPoints,
    percentage,
    passed: exam.passMark === null ? null : percentage >= exam.passMark,
  }
}

// Full breakdown for the lecturer or admin: each question, the student's choice and the right answer
async function staffView(attempt, exam) {
  const totalPoints = await examTotalPoints(exam.id)
  const [questions, answers, student] = await Promise.all([
    loadQuestions(exam.id),
    AttemptAnswer.findAll({ where: { attemptId: attempt.id } }),
    attempt.getStudent({ attributes: ['id', 'fullName', 'email'] }),
  ])

  return {
    ...resultView(attempt, exam, totalPoints),
    student,
    questions: questions.map((q) => {
      const answer = answers.find((a) => a.questionId === q.id)
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionId: answer?.selectedOptionId ?? null,
        isCorrect: answer?.isCorrect ?? false,
        pointsAwarded: answer?.pointsAwarded ?? 0,
      }
    }),
  }
}

// ---------- Loading an attempt ----------

// Students may only open their own attempts; staff may open attempts of exams they manage
async function findAttemptForUser(attemptId, user) {
  const notFound = new HttpError(404, 'Attempt not found')
  const attempt = await ExamAttempt.findByPk(attemptId, { include: [{ model: Exam, as: 'exam' }] })

  if (!attempt) throw notFound

  const isOwner = attempt.studentId === user.id
  let canManage = false

  if (!isOwner) {
    try {
      ;({ canManage } = await findExamForUser(attempt.examId, user))
    } catch (err) {
      if (err.status === 404) throw notFound
      throw err
    }
    if (!canManage) throw notFound
  }

  await expireIfTimeUp(attempt, attempt.exam)
  return { attempt, exam: attempt.exam, isOwner, canManage }
}

function assertOwner(isOwner) {
  if (!isOwner) {
    throw new HttpError(403, 'Only the student taking this attempt can do this')
  }
}

// ---------- Actions ----------

async function startAttempt(examId, user) {
  if (user.role !== 'student') {
    throw new HttpError(403, 'Only students can take exams')
  }

  const { exam } = await findExamForUser(examId, user)
  const now = new Date()

  if (exam.status !== 'published') throw new HttpError(409, 'This exam is closed')
  if (now < exam.startAt) throw new HttpError(409, 'This exam has not started yet')
  if (now >= exam.endAt) throw new HttpError(409, 'This exam has ended')

  // Resume an open attempt instead of starting a new one
  const open = await ExamAttempt.findOne({
    where: { examId: exam.id, studentId: user.id, status: 'in_progress' },
  })
  if (open) {
    await expireIfTimeUp(open, exam)
    if (open.status === 'in_progress') {
      return { view: await inProgressView(open, exam), resumed: true }
    }
  }

  const used = await ExamAttempt.count({ where: { examId: exam.id, studentId: user.id } })
  if (used >= exam.maxAttempts) {
    throw new HttpError(409, `You have used all ${exam.maxAttempts} attempt(s) for this exam`)
  }

  const attempt = await ExamAttempt.create({
    examId: exam.id,
    studentId: user.id,
    attemptNumber: used + 1,
    startedAt: now,
  })
  return { view: await inProgressView(attempt, exam), resumed: false }
}

async function getAttempt(attemptId, user) {
  const { attempt, exam, isOwner } = await findAttemptForUser(attemptId, user)

  if (!isOwner) return staffView(attempt, exam)
  if (attempt.status === 'in_progress') return inProgressView(attempt, exam)
  return resultView(attempt, exam, await examTotalPoints(exam.id))
}

async function saveAnswer(attemptId, user, { questionId, optionId }) {
  const { attempt, exam, isOwner } = await findAttemptForUser(attemptId, user)
  assertOwner(isOwner)

  if (attempt.status !== 'in_progress') {
    throw new HttpError(409, 'Time is up or this attempt was already submitted; answers can no longer change')
  }

  const question = await Question.findOne({ where: { id: questionId, examId: exam.id } })
  if (!question) {
    throw new HttpError(400, 'This question is not part of the exam')
  }
  if (optionId !== null) {
    const option = await QuestionOption.findOne({ where: { id: optionId, questionId } })
    if (!option) {
      throw new HttpError(400, 'This option does not belong to the question')
    }
  }

  const existing = await AttemptAnswer.findOne({ where: { attemptId: attempt.id, questionId } })
  if (existing) {
    await existing.update({ selectedOptionId: optionId })
  } else {
    await AttemptAnswer.create({ attemptId: attempt.id, questionId, selectedOptionId: optionId })
  }

  return { questionId, selectedOptionId: optionId }
}

async function submitAttempt(attemptId, user) {
  const { attempt, exam, isOwner } = await findAttemptForUser(attemptId, user)
  assertOwner(isOwner)

  if (attempt.status !== 'in_progress') {
    throw new HttpError(409, 'This attempt has already been submitted')
  }

  await finalizeAttempt(attempt.id, exam, 'submitted')
  await attempt.reload()
  return resultView(attempt, exam, await examTotalPoints(exam.id))
}

// Students get their own attempts; staff get every student's attempts
async function listAttemptsForExam(examId, user) {
  const { exam, canManage } = await findExamForUser(examId, user)
  const where = { examId: exam.id, ...(canManage ? {} : { studentId: user.id }) }

  const open = await ExamAttempt.findAll({ where: { ...where, status: 'in_progress' } })
  for (const attempt of open) {
    await expireIfTimeUp(attempt, exam)
  }

  const attempts = await ExamAttempt.findAll({
    where,
    include: canManage ? [{ association: 'student', attributes: ['id', 'fullName', 'email'] }] : [],
    order: [['startedAt', 'DESC']],
  })
  const totalPoints = await examTotalPoints(exam.id)
  const results = attempts.map((a) => ({
    ...resultView(a, exam, totalPoints),
    ...(canManage ? { student: a.student } : {}),
  }))

  if (!canManage) {
    return { maxAttempts: exam.maxAttempts, attemptsUsed: attempts.length, attempts: results }
  }

  const enrolledCount = await Enrollment.count({ where: { courseId: exam.courseId } })
  return {
    maxAttempts: exam.maxAttempts,
    summary: summarizeResults(results, enrolledCount, exam.passMark),
    attempts: results,
  }
}

// Class statistics, counting each student's best finished attempt
function summarizeResults(results, enrolledCount, passMark) {
  const bestByStudent = new Map()
  for (const result of results) {
    if (result.status === 'in_progress') continue
    const best = bestByStudent.get(result.student.id)
    if (!best || result.percentage > best.percentage) {
      bestByStudent.set(result.student.id, result)
    }
  }

  const best = [...bestByStudent.values()]
  const percentages = best.map((r) => r.percentage)
  const round = (n) => Math.round(n * 100) / 100

  return {
    enrolledCount,
    studentsFinished: best.length,
    inProgress: results.filter((r) => r.status === 'in_progress').length,
    averagePercentage: best.length ? round(percentages.reduce((a, b) => a + b, 0) / best.length) : null,
    highestPercentage: best.length ? Math.max(...percentages) : null,
    lowestPercentage: best.length ? Math.min(...percentages) : null,
    passedCount: passMark === null ? null : best.filter((r) => r.passed).length,
  }
}

// A student's finished attempts across all their courses, newest first
async function listMyResults(user) {
  if (user.role !== 'student') {
    throw new HttpError(403, 'Only students have exam results')
  }

  const examInclude = {
    model: Exam,
    as: 'exam',
    include: [{ association: 'course', attributes: ['id', 'code', 'title'] }],
  }

  const open = await ExamAttempt.findAll({
    where: { studentId: user.id, status: 'in_progress' },
    include: [examInclude],
  })
  for (const attempt of open) {
    await expireIfTimeUp(attempt, attempt.exam)
  }

  const attempts = await ExamAttempt.findAll({
    where: { studentId: user.id, status: { [Op.ne]: 'in_progress' } },
    include: [examInclude],
    order: [['submittedAt', 'DESC']],
  })

  const totals = new Map()
  for (const examId of new Set(attempts.map((a) => a.examId))) {
    totals.set(examId, await examTotalPoints(examId))
  }

  return attempts.map((a) => ({
    ...resultView(a, a.exam, totals.get(a.examId)),
    course: a.exam.course,
  }))
}

// ---------- CSV export ----------

// Quotes a value for CSV, and stops spreadsheet apps treating text like "=SUM(...)" as a formula
function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const statusLabels = { submitted: 'Submitted', expired: 'Time ran out', in_progress: 'In progress' }

async function examResultsCsv(examId, user) {
  const { exam, canManage } = await findExamForUser(examId, user)
  if (!canManage) {
    throw new HttpError(403, 'Only an admin or this course\'s lecturer can download results')
  }

  const { attempts } = await listAttemptsForExam(examId, user)
  const header = ['Student', 'Email', 'Attempt', 'Status', 'Started', 'Handed in', 'Score', 'Total points', 'Percentage', 'Passed']
  const rows = [...attempts]
    .sort((a, b) => a.student.fullName.localeCompare(b.student.fullName) || a.attemptNumber - b.attemptNumber)
    .map((a) => [
      a.student.fullName,
      a.student.email,
      a.attemptNumber,
      statusLabels[a.status] ?? a.status,
      a.startedAt?.toISOString(),
      a.submittedAt?.toISOString(),
      a.status === 'in_progress' ? '' : a.score,
      a.totalPoints,
      a.status === 'in_progress' ? '' : a.percentage,
      a.passed === null || a.status === 'in_progress' ? '' : a.passed ? 'Yes' : 'No',
    ])

  // The byte-order mark helps Excel read names with accents correctly
  const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
  const safeTitle = exam.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'exam'

  return { csv, filename: `${safeTitle}-results.csv` }
}

module.exports = {
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
  listAttemptsForExam,
  listMyResults,
  examResultsCsv,
}
