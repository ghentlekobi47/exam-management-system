const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const decimalField = require('./decimalField')

const AttemptAnswer = sequelize.define(
  'AttemptAnswer',
  {
    attemptId: { type: DataTypes.INTEGER, allowNull: false },
    questionId: { type: DataTypes.INTEGER, allowNull: false },
    selectedOptionId: { type: DataTypes.INTEGER, allowNull: true },
    isCorrect: { type: DataTypes.BOOLEAN, allowNull: true },
    pointsAwarded: decimalField('pointsAwarded', 5, 2, { allowNull: false, defaultValue: 0 }),
  },
  {
    tableName: 'attempt_answers',
    indexes: [{ unique: true, fields: ['attempt_id', 'question_id'] }],
  },
)

module.exports = AttemptAnswer
