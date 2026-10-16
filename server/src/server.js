const app = require('./app')
const env = require('./config/env')
const sequelize = require('./config/database')

async function start() {
  try {
    await sequelize.authenticate()
    console.log(`Connected to MySQL database ${env.DB_NAME}`)
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message)
    await sequelize.close()
    process.exitCode = 1
    return
  }

  // Express 5 calls this callback on listen errors too
  const server = app.listen(env.PORT, (err) => {
    if (err) {
      console.error('Failed to start CampusIQ API:', err.message)
      process.exitCode = 1
      sequelize.close()
      return
    }

    console.log(`CampusIQ API listening on port ${env.PORT}`)
    // Not secret; quoted so stray spaces or hidden characters from copy-paste show up
    console.log(`[cors] Allowed websites: ${env.clientOrigins.map((origin) => JSON.stringify(origin)).join(', ')}`)
  })

  const shutdown = () => {
    server.close(() => sequelize.close())
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

start()
