const { z } = require('zod')

// Route ids like /courses/:id arrive as strings; this turns them into positive integers
const id = z.coerce.number().int().positive()

const idParams = z.object({ id })

module.exports = { id, idParams }
