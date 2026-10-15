const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

// The current email verification code for a user. Only a hash of the code is stored.
const EmailVerificationCode = sequelize.define(
  'EmailVerificationCode',
  {
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    codeHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastSentAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'email_verification_codes' },
)

module.exports = EmailVerificationCode
