const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const decimalField = require('./decimalField')

const Exam = sequelize.define(
  'Exam',
  {
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    instructions: { type: DataTypes.TEXT, allowNull: true },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endAt: { type: DataTypes.DATE, allowNull: false },
    maxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },
    // Percentage (0-100) a student needs to pass
    passMark: decimalField('passMark', 5, 2, { allowNull: true }),
    shuffleQuestions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'closed'),
      allowNull: false,
      defaultValue: 'draft',
    },
  },
  {
    tableName: 'exams',
    validate: {
      endsAfterStart() {
        if (this.startAt && this.endAt && this.endAt <= this.startAt) {
          throw new Error('endAt must be after startAt')
        }
      },
    },
  },
)

module.exports = Exam
