const express = require('express')
const authenticate = require('../../middleware/authenticate')
const authorize = require('../../middleware/authorize')
const validate = require('../../middleware/validate')
const { idParams } = require('../../utils/schemas')
const {
  createCourseSchema,
  updateCourseSchema,
  enrollSchema,
  enrollmentParams,
} = require('./courses.schemas')
const courses = require('./courses.controller')
const exams = require('../exams/exams.controller')
const { createExamSchema } = require('../exams/exams.schemas')

const router = express.Router()

router.use(authenticate)

// Courses: admins manage them; everyone sees the courses that apply to them
router.post('/', authorize('admin'), validate(createCourseSchema), courses.create)
router.get('/', courses.list)
router.get('/:id', validate(idParams, 'params'), courses.getOne)
router.patch(
  '/:id',
  authorize('admin'),
  validate(idParams, 'params'),
  validate(updateCourseSchema),
  courses.update,
)
router.delete('/:id', authorize('admin'), validate(idParams, 'params'), courses.remove)

// Enrollments: the admin or the course's lecturer
router.get('/:id/students', validate(idParams, 'params'), courses.listStudents)
router.post(
  '/:id/students',
  validate(idParams, 'params'),
  validate(enrollSchema),
  courses.enrollStudent,
)
router.delete(
  '/:id/students/:studentId',
  validate(enrollmentParams, 'params'),
  courses.unenrollStudent,
)

// Exams of a course: managers create them; enrolled students see published ones
router.get('/:id/exams', validate(idParams, 'params'), exams.listForCourse)
router.post(
  '/:id/exams',
  validate(idParams, 'params'),
  validate(createExamSchema),
  exams.createForCourse,
)

module.exports = router
