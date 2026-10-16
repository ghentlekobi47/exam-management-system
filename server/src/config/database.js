const { Sequelize } = require('sequelize')
const env = require('./env')

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: { underscored: true },
  // Encrypted connection for hosted databases (DB_SSL=true), e.g. Aiven
  ...(env.dbSsl ? { dialectOptions: { ssl: env.dbSsl } } : {}),
})

module.exports = sequelize
