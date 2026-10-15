const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const decimalField = require('./decimalField')

const ExamAttempt = sequelize.define(
  'ExamAttempt',
  {
    examId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    score: decimalField('score', 6, 2, { allowNull: true }),
    status: {
      type: DataTypes.ENUM('in_progress', 'submitted', 'expired'),
      allowNull: false,
      defaultValue: 'in_progress',
    },
  },
  {
    tableName: 'exam_attempts',
    indexes: [{ unique: true, fields: ['exam_id', 'student_id', 'attempt_number'] }],
  },
)

module.exports = ExamAttempt
