const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const apiRoutes = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(cors({ origin: env.CLIENT_ORIGIN }))
// 1 MB leaves room for question imports (CSV files sent as JSON)
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
