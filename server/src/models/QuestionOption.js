const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

// True/false questions use two options, "True" and "False"
const QuestionOption = sequelize.define(
  'QuestionOption',
  {
    questionId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.STRING(500), allowNull: false },
    isCorrect: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'question_options' },
)

module.exports = QuestionOption
