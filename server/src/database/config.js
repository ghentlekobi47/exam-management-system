// Config for sequelize-cli, built from the same validated env as the app
const env = require('../config/env')

const config = {
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  ...(env.dbSsl ? { dialectOptions: { ssl: env.dbSsl } } : {}),
}

module.exports = {
  development: config,
  test: config,
  production: config,
}
