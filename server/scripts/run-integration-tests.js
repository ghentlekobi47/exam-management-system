// Runs the database tests in tests/integration against a separate, throwaway
// database (campusiq_test), rebuilt from the migrations on every run.
// Your real database is never touched.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const TEST_DB = 'campusiq_test'
const root = path.resolve(__dirname, '..')

// These win over server/.env (dotenv never overrides variables that are already set).
// Email settings are blanked so no real emails are sent.
const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DB_NAME: TEST_DB,
  MAIL_TRANSPORT: 'smtp',
  MAIL_USER: '',
  MAIL_PASSWORD: '',
  MAIL_APP_PASSWORD: '',
  BREVO_API_KEY: '',
}
Object.assign(process.env, testEnv)

async function resetDatabase() {
  const mysql = require('mysql2/promise')
  const env = require('../src/config/env')
  if (!env.DB_NAME.endsWith('_test')) throw new Error('Refusing to reset a database whose name does not end in _test')

  let connection
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: env.dbSsl ?? undefined,
    })
  } catch (err) {
    console.log(`Skipping database tests: cannot reach MySQL at ${env.DB_HOST}:${env.DB_PORT} (${err.code ?? err.message}).`)
    console.log('Start MySQL and check server/.env, then run npm run test:integration again.')
    process.exit(0)
  }

  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``)
  await connection.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.end()
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env: testEnv, stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

;(async () => {
  console.log(`Preparing the test database "${TEST_DB}"…`)
  await resetDatabase()
  run('npx', ['sequelize-cli', 'db:migrate'])

  const dir = path.join(root, 'tests', 'integration')
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.integration.js'))
    .map((name) => path.join('tests', 'integration', name))

  // One file at a time, since they share the test database
  run('node', ['--test', '--test-concurrency=1', ...files])
})()
