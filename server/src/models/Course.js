const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Course = sequelize.define(
  'Course',
  {
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    lecturerId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'courses' },
)

module.exports = Course
