const { ForeignKeyConstraintError, Op } = require('sequelize')
const { sequelize, Exam, Question, QuestionOption } = require('../../models')
const HttpError = require('../../utils/httpError')
const { findCourseForUser, canManageCourse } = require('../courses/courses.service')

const questionsWithOptions = {
  include: [{ association: 'questions', include: [{ association: 'options' }] }],
  order: [
    [{ model: Question, as: 'questions' }, 'position', 'ASC'],
    [{ model: Question, as: 'questions' }, 'id', 'ASC'],
    [{ model: Question, as: 'questions' }, { model: QuestionOption, as: 'options' }, 'position', 'ASC'],
  ],
}

// Returns the exam if this user may see it, plus whether they may manage it.
// Students only see published or closed exams of courses they're enrolled in.
async function findExamForUser(examId, user) {
  const notFound = new HttpError(404, 'Exam not found')
  const exam = await Exam.findByPk(examId)

  if (!exam) throw notFound

  let course
  try {
    course = await findCourseForUser(exam.courseId, user)
  } catch (err) {
    if (err.status === 404) throw notFound
    throw err
  }

  const canManage = canManageCourse(course, user)
  if (!canManage && exam.status === 'draft') throw notFound

  return { exam, canManage }
}

async function findManagedExam(examId, user) {
  const { exam, canManage } = await findExamForUser(examId, user)

  if (!canManage) {
    throw new HttpError(403, 'Only an admin or this course\'s lecturer can do this')
  }
  return exam
}

// Published exams are locked so every student gets the same exam
function assertDraft(exam) {
  if (exam.status !== 'draft') {
    throw new HttpError(409, 'Only draft exams can be changed')
  }
}

function createExam(course, data, user) {
  return Exam.create({ ...data, courseId: course.id, createdBy: user.id })
}

function listExams(course, canManage) {
  return Exam.findAll({
    where: {
      courseId: course.id,
      ...(canManage ? {} : { status: { [Op.in]: ['published', 'closed'] } }),
    },
    order: [['startAt', 'ASC']],
  })
}

function withTotals(exam) {
  const data = exam.toJSON()
  data.questionCount = data.questions.length
  data.totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0)
  return data
}

// Managers get the full exam with answers; students only get the summary
// (they see the questions when they start an attempt)
async function getExamDetail(exam, canManage) {
  const full = await Exam.findByPk(exam.id, questionsWithOptions)
  const data = withTotals(full)

  if (!canManage) {
    delete data.questions
  }
  return data
}

async function updateExam(exam, changes) {
  assertDraft(exam)

  const startAt = changes.startAt ?? exam.startAt
  const endAt = changes.endAt ?? exam.endAt
  if (endAt <= startAt) {
    throw new HttpError(400, 'endAt must be after startAt')
  }

  await exam.update(changes)
  return exam
}

async function deleteExam(exam) {
  try {
    await exam.destroy()
  } catch (err) {
    if (err instanceof ForeignKeyConstraintError) {
      throw new HttpError(409, 'Students have already attempted this exam, so it can\'t be deleted')
    }
    throw err
  }
}

function optionsFor(data) {
  const options =
    data.type === 'true_false'
      ? [
          { text: 'True', isCorrect: data.correctAnswer },
          { text: 'False', isCorrect: !data.correctAnswer },
        ]
      : data.options

  return options.map((option, index) => ({ ...option, position: index }))
}

function findQuestionWithOptions(questionId, transaction) {
  return Question.findByPk(questionId, {
    include: [{ association: 'options' }],
    order: [[{ model: QuestionOption, as: 'options' }, 'position', 'ASC']],
    transaction,
  })
}

async function addQuestion(exam, data) {
  assertDraft(exam)

  return sequelize.transaction(async (transaction) => {
    const position = await Question.count({ where: { examId: exam.id }, transaction })
    const question = await Question.create(
      { examId: exam.id, type: data.type, text: data.text, points: data.points, position },
      { transaction },
    )
    await QuestionOption.bulkCreate(
      optionsFor(data).map((option) => ({ ...option, questionId: question.id })),
      { transaction },
    )
    return findQuestionWithOptions(question.id, transaction)
  })
}

// Adds many questions in one go (from a CSV import); all are saved or none are
async function addQuestions(exam, questionsData) {
  assertDraft(exam)

  return sequelize.transaction(async (transaction) => {
    let position = await Question.count({ where: { examId: exam.id }, transaction })
    const ids = []

    for (const data of questionsData) {
      const question = await Question.create(
        { examId: exam.id, type: data.type, text: data.text, points: data.points, position: position++ },
        { transaction },
      )
      await QuestionOption.bulkCreate(
        optionsFor(data).map((option) => ({ ...option, questionId: question.id })),
        { transaction },
      )
      ids.push(question.id)
    }

    return ids.length
  })
}

async function findExamQuestion(exam, questionId) {
  const question = await Question.findOne({ where: { id: questionId, examId: exam.id } })

  if (!question) {
    throw new HttpError(404, 'Question not found')
  }
  return question
}

// Replaces a question's text, points and options in one go
async function replaceQuestion(exam, questionId, data) {
  assertDraft(exam)
  const question = await findExamQuestion(exam, questionId)

  return sequelize.transaction(async (transaction) => {
    await question.update({ type: data.type, text: data.text, points: data.points }, { transaction })
    await QuestionOption.destroy({ where: { questionId: question.id }, transaction })
    await QuestionOption.bulkCreate(
      optionsFor(data).map((option) => ({ ...option, questionId: question.id })),
      { transaction },
    )
    return findQuestionWithOptions(question.id, transaction)
  })
}

async function deleteQuestion(exam, questionId) {
  assertDraft(exam)
  const question = await findExamQuestion(exam, questionId)
  await question.destroy()
}

async function publishExam(exam) {
  assertDraft(exam)

  const questionCount = await Question.count({ where: { examId: exam.id } })
  if (questionCount === 0) {
    throw new HttpError(400, 'Add at least one question before publishing')
  }
  if (exam.endAt <= new Date()) {
    throw new HttpError(400, 'The exam\'s end time has already passed; change endAt first')
  }

  await exam.update({ status: 'published' })
  return exam
}

async function closeExam(exam) {
  if (exam.status !== 'published') {
    throw new HttpError(409, 'Only published exams can be closed')
  }

  await exam.update({ status: 'closed' })
  return exam
}

module.exports = {
  findExamForUser,
  findManagedExam,
  assertDraft,
  createExam,
  listExams,
  getExamDetail,
  updateExam,
  deleteExam,
  addQuestion,
  addQuestions,
  replaceQuestion,
  deleteQuestion,
  publishExam,
  closeExam,
}
