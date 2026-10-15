const coursesService = require('./courses.service')

async function create(req, res) {
  const course = await coursesService.createCourse(req.body)
  res.status(201).json({ course })
}

async function list(req, res) {
  const courses = await coursesService.listCoursesForUser(req.user)
  res.status(200).json({ courses })
}

async function getOne(req, res) {
  const course = await coursesService.findCourseForUser(req.params.id, req.user)
  res.status(200).json({ course })
}

async function update(req, res) {
  const course = await coursesService.updateCourse(req.params.id, req.body)
  res.status(200).json({ course })
}

async function remove(req, res) {
  await coursesService.deleteCourse(req.params.id)
  res.status(204).end()
}

// Loads the course and checks the user may manage its enrollments
async function findManagedCourse(req) {
  const course = await coursesService.findCourseForUser(req.params.id, req.user)
  coursesService.assertCanManageCourse(course, req.user)
  return course
}

async function listStudents(req, res) {
  const course = await findManagedCourse(req)
  const students = await coursesService.listStudents(course)
  res.status(200).json({ students })
}

async function enrollStudent(req, res) {
  const course = await findManagedCourse(req)
  const student = await coursesService.enrollStudent(course, req.body.email)
  res.status(201).json({ student })
}

async function unenrollStudent(req, res) {
  const course = await findManagedCourse(req)
  await coursesService.unenrollStudent(course, req.params.studentId)
  res.status(204).end()
}

module.exports = { create, list, getOne, update, remove, listStudents, enrollStudent, unenrollStudent }
