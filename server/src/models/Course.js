const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Course = sequelize.define(
  'Course',
  {
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    // Empty until the admin assigns a lecturer
    lecturerId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'courses' },
)

module.exports = Course
