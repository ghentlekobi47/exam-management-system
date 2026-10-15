const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const User = sequelize.define(
  'User',
  {
    fullName: { type: DataTypes.STRING(150), allowNull: false },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM('admin', 'lecturer', 'student'),
      allowNull: false,
      defaultValue: 'student',
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // null until a self-registered student enters their emailed code
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users',
    // Never return password hashes unless explicitly asked for
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  },
)

module.exports = User
