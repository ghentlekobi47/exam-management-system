'use strict'

// A published demo exam in the demo course, so students can try taking an exam.
// Runs after the demo-data seeder, which creates the course and lecturer.
const COURSE_CODE = 'CS101'
const EXAM_TITLE = 'Demo Quiz'

const QUESTIONS = [
  {
    type: 'true_false',
    text: 'The CPU is often called the brain of the computer.',
    points: 1,
    options: [
      ['True', true],
      ['False', false],
    ],
  },
  {
    type: 'multiple_choice',
    text: 'Which of these is an input device?',
    points: 2,
    options: [
      ['Monitor', false],
      ['Keyboard', true],
      ['Printer', false],
      ['Speaker', false],
    ],
  },
  {
    type: 'multiple_choice',
    text: 'How many bits are in one byte?',
    points: 2,
    options: [
      ['4', false],
      ['8', true],
      ['16', false],
    ],
  },
]

async function findDemoCourse(queryInterface) {
  const [[course]] = await queryInterface.sequelize.query(
    `SELECT c.id, c.lecturer_id FROM courses c
     JOIN users u ON u.id = c.lecturer_id
     WHERE c.code = :code AND u.email = 'lecturer@campusiq.test'`,
    { replacements: { code: COURSE_CODE } },
  )
  return course
}

module.exports = {
  async up(queryInterface) {
    const course = await findDemoCourse(queryInterface)
    if (!course) {
      console.log('Demo course not found, skipping demo exam')
      return
    }

    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM exams WHERE course_id = :courseId AND title = :title',
      { replacements: { courseId: course.id, title: EXAM_TITLE } },
    )
    if (existing.length > 0) {
      console.log('Demo exam already exists, skipping')
      return
    }

    const now = new Date()
    const day = 24 * 60 * 60 * 1000

    await queryInterface.bulkInsert('exams', [
      {
        course_id: course.id,
        created_by: course.lecturer_id,
        title: EXAM_TITLE,
        instructions: 'Answer all questions. You have 2 attempts.',
        duration_minutes: 15,
        start_at: new Date(now.getTime() - day),
        end_at: new Date(now.getTime() + 60 * day),
        max_attempts: 2,
        pass_mark: 60,
        shuffle_questions: false,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
    ])

    const [[exam]] = await queryInterface.sequelize.query(
      'SELECT id FROM exams WHERE course_id = :courseId AND title = :title',
      { replacements: { courseId: course.id, title: EXAM_TITLE } },
    )

    for (const [position, question] of QUESTIONS.entries()) {
      await queryInterface.bulkInsert('questions', [
        {
          exam_id: exam.id,
          type: question.type,
          text: question.text,
          points: question.points,
          position,
          created_at: now,
          updated_at: now,
        },
      ])
      const [[saved]] = await queryInterface.sequelize.query(
        'SELECT id FROM questions WHERE exam_id = :examId AND position = :position',
        { replacements: { examId: exam.id, position } },
      )
      await queryInterface.bulkInsert(
        'question_options',
        question.options.map(([text, isCorrect], optionPosition) => ({
          question_id: saved.id,
          text,
          is_correct: isCorrect,
          position: optionPosition,
          created_at: now,
          updated_at: now,
        })),
      )
    }
  },

  async down(queryInterface) {
    const course = await findDemoCourse(queryInterface)
    if (!course) return

    // Attempts block deleting an exam, so remove them first (their answers go with them)
    await queryInterface.sequelize.query(
      `DELETE a FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
       WHERE e.course_id = :courseId AND e.title = :title`,
      { replacements: { courseId: course.id, title: EXAM_TITLE } },
    )
    // Removing the exam also removes its questions and options (ON DELETE CASCADE)
    await queryInterface.bulkDelete('exams', { course_id: course.id, title: EXAM_TITLE })
  },
}
