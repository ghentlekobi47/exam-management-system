const express = require('express')
const authenticate = require('../../middleware/authenticate')
const validate = require('../../middleware/validate')
const { idParams } = require('../../utils/schemas')
const { updateExamSchema, questionSchema, questionParams } = require('./exams.schemas')
const { importSchema } = require('./questionImport')
const exams = require('./exams.controller')
const attempts = require('../attempts/attempts.controller')

const router = express.Router()

router.use(authenticate)

// Students can view published exams; changes need the admin or the course's lecturer
router.get('/:id', validate(idParams, 'params'), exams.getOne)
router.patch('/:id', validate(idParams, 'params'), validate(updateExamSchema), exams.update)
router.delete('/:id', validate(idParams, 'params'), exams.remove)
router.post('/:id/publish', validate(idParams, 'params'), exams.publish)
router.post('/:id/close', validate(idParams, 'params'), exams.close)

// Questions can only be changed while the exam is a draft
router.post('/:id/questions', validate(idParams, 'params'), validate(questionSchema), exams.addQuestion)
router.post(
  '/:id/questions/import',
  validate(idParams, 'params'),
  validate(importSchema),
  exams.importQuestions,
)
router.put(
  '/:id/questions/:questionId',
  validate(questionParams, 'params'),
  validate(questionSchema),
  exams.replaceQuestion,
)
router.delete('/:id/questions/:questionId', validate(questionParams, 'params'), exams.deleteQuestion)

// Attempts: students start (or resume) one; students see their own, staff see everyone's
router.post('/:id/attempts', validate(idParams, 'params'), attempts.start)
router.get('/:id/attempts', validate(idParams, 'params'), attempts.listForExam)
router.get('/:id/results.csv', validate(idParams, 'params'), attempts.downloadCsv)

module.exports = router
