const fs = require('node:fs')
const path = require('node:path')
const { textToBoolean } = require('./mailSettings')

// "https://a.vercel.app, http://localhost:5173" -> ['https://a.vercel.app', 'http://localhost:5173']
function parseOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

// SSL settings for MySQL. Hosted databases like Aiven require an encrypted connection.
// DB_SSL=true turns it on; the CA certificate comes from DB_SSL_CA (pasted text) or DB_SSL_CA_FILE (a file).
function resolveDbSsl(raw, baseDir = path.resolve(__dirname, '../..')) {
  if (!textToBoolean(raw.DB_SSL, false)) return null

  let ca = (raw.DB_SSL_CA ?? '').trim()
  if (!ca && raw.DB_SSL_CA_FILE) {
    ca = fs.readFileSync(path.resolve(baseDir, raw.DB_SSL_CA_FILE), 'utf8')
  }
  // Hosting dashboards often store multi-line values with literal "\n"
  ca = ca.replace(/\\n/g, '\n')

  if (ca && !ca.includes('BEGIN CERTIFICATE')) {
    throw new Error('Invalid server environment:\nDB_SSL_CA: paste the whole certificate, including the BEGIN/END CERTIFICATE lines')
  }

  // With a CA the server's identity is checked; without one the connection is still encrypted
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }
}

module.exports = { parseOrigins, resolveDbSsl }
