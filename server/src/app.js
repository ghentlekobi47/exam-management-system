const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const env = require('./config/env')
const apiRoutes = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Hosts like Render sit in front of the app; trust their proxy so rate limits see each visitor's real IP
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Standard security headers
app.use(helmet())
app.use(cors({ origin: env.clientOrigins }))
// 1 MB leaves room for question imports (CSV files sent as JSON)
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
