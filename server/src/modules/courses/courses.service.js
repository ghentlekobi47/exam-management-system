const { ForeignKeyConstraintError } = require('sequelize')
const { Course, Enrollment, User } = require('../../models')
const HttpError = require('../../utils/httpError')

const lecturerInclude = { association: 'lecturer', attributes: ['id', 'fullName', 'email'] }
const studentAttributes = ['id', 'fullName', 'email', 'isActive']

async function assertActiveLecturer(lecturerId) {
  const lecturer = await User.findByPk(lecturerId)

  if (!lecturer || lecturer.role !== 'lecturer' || !lecturer.isActive) {
    throw new HttpError(400, 'lecturerId must belong to an active lecturer')
  }
}

async function assertCodeAvailable(code, exceptCourseId) {
  const existing = await Course.findOne({ where: { code } })

  if (existing && existing.id !== exceptCourseId) {
    throw new HttpError(409, 'A course with this code already exists')
  }
}

function findCourseWithLecturer(id) {
  return Course.findByPk(id, { include: [lecturerInclude] })
}

// Returns the course if this user may see it: admins see all, lecturers see
// the courses they teach, students see the courses they're enrolled in.
// Anyone else gets 404, so we don't reveal that the course exists.
async function findCourseForUser(courseId, user) {
  const course = await findCourseWithLecturer(courseId)
  const notFound = new HttpError(404, 'Course not found')

  if (!course) throw notFound
  if (user.role === 'admin') return course
  if (user.role === 'lecturer' && course.lecturerId === user.id) return course
  if (user.role === 'student') {
    const enrolled = await Enrollment.findOne({ where: { courseId, studentId: user.id } })
    if (enrolled) return course
  }

  throw notFound
}

// Admins and the course's own lecturer may manage it (e.g. enrollments, exams)
function canManageCourse(course, user) {
  return user.role === 'admin' || (user.role === 'lecturer' && course.lecturerId === user.id)
}

function assertCanManageCourse(course, user) {
  if (!canManageCourse(course, user)) {
    throw new HttpError(403, 'Only an admin or this course\'s lecturer can do this')
  }
}

async function createCourse(data) {
  await assertActiveLecturer(data.lecturerId)
  await assertCodeAvailable(data.code)

  const course = await Course.create(data)
  return findCourseWithLecturer(course.id)
}

function listCoursesForUser(user) {
  const options = { include: [lecturerInclude], order: [['code', 'ASC']] }

  if (user.role === 'lecturer') {
    options.where = { lecturerId: user.id }
  } else if (user.role === 'student') {
    options.include.push({
      association: 'students',
      where: { id: user.id },
      attributes: [],
      through: { attributes: [] },
    })
  }

  return Course.findAll(options)
}

async function updateCourse(id, changes) {
  const course = await Course.findByPk(id)

  if (!course) {
    throw new HttpError(404, 'Course not found')
  }
  if (changes.lecturerId) {
    await assertActiveLecturer(changes.lecturerId)
  }
  if (changes.code) {
    await assertCodeAvailable(changes.code, course.id)
  }

  await course.update(changes)
  return findCourseWithLecturer(course.id)
}

async function deleteCourse(id) {
  const course = await Course.findByPk(id)

  if (!course) {
    throw new HttpError(404, 'Course not found')
  }

  try {
    await course.destroy()
  } catch (err) {
    if (err instanceof ForeignKeyConstraintError) {
      throw new HttpError(409, 'Course has exam attempts and can\'t be deleted')
    }
    throw err
  }
}

function listStudents(course) {
  return course.getStudents({
    attributes: studentAttributes,
    joinTableAttributes: [],
    order: [['fullName', 'ASC']],
  })
}

async function enrollStudent(course, email) {
  const student = await User.findOne({ where: { email }, attributes: studentAttributes.concat('role') })

  if (!student || student.role !== 'student' || !student.isActive) {
    throw new HttpError(400, 'No active student account with this email')
  }

  const existing = await Enrollment.findOne({ where: { courseId: course.id, studentId: student.id } })
  if (existing) {
    throw new HttpError(409, 'This student is already enrolled')
  }

  await Enrollment.create({ courseId: course.id, studentId: student.id })
  return student
}

async function unenrollStudent(course, studentId) {
  const removed = await Enrollment.destroy({ where: { courseId: course.id, studentId } })

  if (removed === 0) {
    throw new HttpError(404, 'This student is not enrolled in the course')
  }
}

module.exports = {
  findCourseForUser,
  canManageCourse,
  assertCanManageCourse,
  createCourse,
  listCoursesForUser,
  updateCourse,
  deleteCourse,
  listStudents,
  enrollStudent,
  unenrollStudent,
}
