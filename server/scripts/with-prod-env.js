// Runs a command using the settings in server/.env.production (the hosted database),
// e.g. node scripts/with-prod-env.js sequelize-cli db:migrate
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const envFile = '.env.production'
if (!fs.existsSync(path.resolve(__dirname, '..', envFile))) {
  console.error(`Missing server/${envFile}. Copy server/.env.example to server/${envFile} and fill in the hosted settings.`)
  process.exit(1)
}

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error('Usage: node scripts/with-prod-env.js <command> [args...]')
  process.exit(1)
}

// Keep arguments with spaces together, e.g. a full name like "Benjamin Kobi"
const quoted = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`)

console.log(`Using server/${envFile}`)
const result = spawnSync(command, quoted, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, ENV_FILE: envFile, NODE_ENV: 'production' },
})
process.exit(result.status ?? 1)
