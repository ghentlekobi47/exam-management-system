const express = require('express')
const healthRoutes = require('../modules/health/health.routes')
const authRoutes = require('../modules/auth/auth.routes')
const usersRoutes = require('../modules/users/users.routes')
const coursesRoutes = require('../modules/courses/courses.routes')
const examsRoutes = require('../modules/exams/exams.routes')
const attemptsRoutes = require('../modules/attempts/attempts.routes')

const router = express.Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/courses', coursesRoutes)
router.use('/exams', examsRoutes)
router.use('/attempts', attemptsRoutes)

module.exports = router
