const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const decimalField = require('./decimalField')

const Question = sequelize.define(
  'Question',
  {
    examId: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM('multiple_choice', 'true_false'),
      allowNull: false,
    },
    text: { type: DataTypes.TEXT, allowNull: false },
    points: decimalField('points', 5, 2, { allowNull: false, defaultValue: 1 }),
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'questions' },
)

module.exports = Question
