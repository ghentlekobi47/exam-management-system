const sequelize = require('../config/database')
const User = require('./User')
const Course = require('./Course')
const Enrollment = require('./Enrollment')
const Exam = require('./Exam')
const Question = require('./Question')
const QuestionOption = require('./QuestionOption')
const ExamAttempt = require('./ExamAttempt')
const AttemptAnswer = require('./AttemptAnswer')

// Lecturers teach courses
User.hasMany(Course, { as: 'taughtCourses', foreignKey: 'lecturerId' })
Course.belongsTo(User, { as: 'lecturer', foreignKey: 'lecturerId' })

// Students enroll in courses
User.belongsToMany(Course, {
  through: Enrollment,
  as: 'enrolledCourses',
  foreignKey: 'studentId',
  otherKey: 'courseId',
})
Course.belongsToMany(User, {
  through: Enrollment,
  as: 'students',
  foreignKey: 'courseId',
  otherKey: 'studentId',
})
Enrollment.belongsTo(User, { as: 'student', foreignKey: 'studentId' })
Enrollment.belongsTo(Course, { as: 'course', foreignKey: 'courseId' })

// Exams belong to courses and are created by lecturers
Course.hasMany(Exam, { as: 'exams', foreignKey: 'courseId' })
Exam.belongsTo(Course, { as: 'course', foreignKey: 'courseId' })
User.hasMany(Exam, { as: 'createdExams', foreignKey: 'createdBy' })
Exam.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' })

// Exams have questions, questions have options
Exam.hasMany(Question, { as: 'questions', foreignKey: 'examId' })
Question.belongsTo(Exam, { as: 'exam', foreignKey: 'examId' })
Question.hasMany(QuestionOption, { as: 'options', foreignKey: 'questionId' })
QuestionOption.belongsTo(Question, { as: 'question', foreignKey: 'questionId' })

// Students attempt exams
Exam.hasMany(ExamAttempt, { as: 'attempts', foreignKey: 'examId' })
ExamAttempt.belongsTo(Exam, { as: 'exam', foreignKey: 'examId' })
User.hasMany(ExamAttempt, { as: 'attempts', foreignKey: 'studentId' })
ExamAttempt.belongsTo(User, { as: 'student', foreignKey: 'studentId' })

// Each attempt stores one answer per question
ExamAttempt.hasMany(AttemptAnswer, { as: 'answers', foreignKey: 'attemptId' })
AttemptAnswer.belongsTo(ExamAttempt, { as: 'attempt', foreignKey: 'attemptId' })
AttemptAnswer.belongsTo(Question, { as: 'question', foreignKey: 'questionId' })
AttemptAnswer.belongsTo(QuestionOption, { as: 'selectedOption', foreignKey: 'selectedOptionId' })

module.exports = {
  sequelize,
  User,
  Course,
  Enrollment,
  Exam,
  Question,
  QuestionOption,
  ExamAttempt,
  AttemptAnswer,
}
