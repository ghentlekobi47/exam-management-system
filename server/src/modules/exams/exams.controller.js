const coursesService = require('../courses/courses.service')
const examsService = require('./exams.service')
const { parseQuestionsCsv } = require('./questionImport')

// Routes under /api/courses/:id/exams

async function createForCourse(req, res) {
  const course = await coursesService.findCourseForUser(req.params.id, req.user)
  coursesService.assertCanManageCourse(course, req.user)

  const exam = await examsService.createExam(course, req.body, req.user)
  res.status(201).json({ exam })
}

async function listForCourse(req, res) {
  const course = await coursesService.findCourseForUser(req.params.id, req.user)
  const exams = await examsService.listExams(course, coursesService.canManageCourse(course, req.user))
  res.status(200).json({ exams })
}

// Routes under /api/exams/:id

async function getOne(req, res) {
  const { exam, canManage } = await examsService.findExamForUser(req.params.id, req.user)
  res.status(200).json({ exam: await examsService.getExamDetail(exam, canManage) })
}

async function update(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  res.status(200).json({ exam: await examsService.updateExam(exam, req.body) })
}

async function remove(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  await examsService.deleteExam(exam)
  res.status(204).end()
}

async function publish(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  res.status(200).json({ exam: await examsService.publishExam(exam) })
}

async function close(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  res.status(200).json({ exam: await examsService.closeExam(exam) })
}

async function addQuestion(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  res.status(201).json({ question: await examsService.addQuestion(exam, req.body) })
}

async function importQuestions(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  // Check the exam can still change before reading the file, so the error is the useful one
  examsService.assertDraft(exam)
  const questions = parseQuestionsCsv(req.body.csv)
  const imported = await examsService.addQuestions(exam, questions)
  res.status(201).json({ imported })
}

async function replaceQuestion(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  const question = await examsService.replaceQuestion(exam, req.params.questionId, req.body)
  res.status(200).json({ question })
}

async function deleteQuestion(req, res) {
  const exam = await examsService.findManagedExam(req.params.id, req.user)
  await examsService.deleteQuestion(exam, req.params.questionId)
  res.status(204).end()
}

module.exports = {
  createForCourse,
  listForCourse,
  getOne,
  update,
  remove,
  publish,
  close,
  addQuestion,
  importQuestions,
  replaceQuestion,
  deleteQuestion,
}
