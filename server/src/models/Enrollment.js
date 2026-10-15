const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Enrollment = sequelize.define(
  'Enrollment',
  {
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'enrollments',
    indexes: [{ unique: true, fields: ['course_id', 'student_id'] }],
  },
)

module.exports = Enrollment
