'use strict'

// Sample courses students can pick from. They start without a lecturer;
// an admin can assign one later with "Edit course".
const COURSES = [
  { code: 'CS102', title: 'Programming Fundamentals', description: 'Variables, control flow, functions and problem solving.' },
  { code: 'CS201', title: 'Data Structures', description: 'Arrays, lists, stacks, queues, trees and their uses.' },
  { code: 'MTH101', title: 'Calculus I', description: 'Limits, derivatives and an introduction to integrals.' },
  { code: 'PHY101', title: 'General Physics', description: 'Motion, forces, energy and waves.' },
  { code: 'ENG101', title: 'Communication Skills', description: 'Clear writing, reading and speaking for university work.' },
  { code: 'BUS101', title: 'Principles of Management', description: 'How organisations plan, organise, lead and control.' },
]
const CODES = COURSES.map((course) => course.code)

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT code FROM courses WHERE code IN (:codes)',
      { replacements: { codes: CODES } },
    )
    const taken = new Set(existing.map((row) => row.code))
    const now = new Date()
    const rows = COURSES.filter((course) => !taken.has(course.code)).map((course) => ({
      ...course,
      lecturer_id: null,
      created_at: now,
      updated_at: now,
    }))

    if (rows.length === 0) {
      console.log('Sample courses already exist, skipping')
      return
    }

    await queryInterface.bulkInsert('courses', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('courses', { code: CODES })
  },
}
