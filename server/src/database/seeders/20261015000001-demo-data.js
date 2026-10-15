'use strict'

// Demo data for local development and testing. These are fake accounts only.
// All demo users log in with the password below.
const bcrypt = require('bcryptjs')

const DEMO_PASSWORD = 'Password123!'
const LECTURER_EMAIL = 'lecturer@campusiq.test'
const STUDENT_EMAILS = ['student1@campusiq.test', 'student2@campusiq.test', 'student3@campusiq.test']
const COURSE_CODE = 'CS101'

module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email IN (:emails) UNION SELECT id FROM courses WHERE code = :code',
      { replacements: { emails: [LECTURER_EMAIL, ...STUDENT_EMAILS], code: COURSE_CODE } },
    )
    if (existing.length > 0) {
      console.log('Demo data already exists, skipping')
      return
    }

    const now = new Date()
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
    const user = (fullName, email, role) => ({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role,
      is_active: true,
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    })

    await queryInterface.bulkInsert('users', [
      user('Demo Lecturer', LECTURER_EMAIL, 'lecturer'),
      user('Demo Student One', STUDENT_EMAILS[0], 'student'),
      user('Demo Student Two', STUDENT_EMAILS[1], 'student'),
      user('Demo Student Three', STUDENT_EMAILS[2], 'student'),
    ])

    const [users] = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE email IN (:emails)',
      { replacements: { emails: [LECTURER_EMAIL, ...STUDENT_EMAILS] } },
    )
    const idOf = (email) => users.find((u) => u.email === email).id

    await queryInterface.bulkInsert('courses', [
      {
        code: COURSE_CODE,
        title: 'Introduction to Computing',
        description: 'Demo course for testing exams.',
        lecturer_id: idOf(LECTURER_EMAIL),
        created_at: now,
        updated_at: now,
      },
    ])

    const [[course]] = await queryInterface.sequelize.query(
      'SELECT id FROM courses WHERE code = :code',
      { replacements: { code: COURSE_CODE } },
    )

    // Students one and two are enrolled; student three is not, for testing access rules
    await queryInterface.bulkInsert(
      'enrollments',
      STUDENT_EMAILS.slice(0, 2).map((email) => ({
        course_id: course.id,
        student_id: idOf(email),
        created_at: now,
        updated_at: now,
      })),
    )
  },

  async down(queryInterface) {
    const [[lecturer]] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email',
      { replacements: { email: LECTURER_EMAIL } },
    )

    // Removing the course also removes its enrollments (ON DELETE CASCADE)
    if (lecturer) {
      await queryInterface.bulkDelete('courses', { code: COURSE_CODE, lecturer_id: lecturer.id })
    }
    await queryInterface.bulkDelete('users', { email: [LECTURER_EMAIL, ...STUDENT_EMAILS] })
  },
}
