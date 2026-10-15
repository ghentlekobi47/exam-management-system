const { z } = require('zod')
const { createUser } = require('../auth/auth.service')
const HttpError = require('../../utils/httpError')
const { listUsersQuerySchema } = require('./users.schemas')
const usersService = require('./users.service')

async function create(req, res) {
  const user = await createUser(req.body)
  res.status(201).json({ user })
}

async function list(req, res) {
  const result = listUsersQuerySchema.safeParse(req.query)

  if (!result.success) {
    throw new HttpError(400, 'Validation failed', z.flattenError(result.error).fieldErrors)
  }

  const users = await usersService.listUsers(result.data)
  res.status(200).json({ users })
}

async function update(req, res) {
  const user = await usersService.updateUser(req.params.id, req.body, req.user)
  res.status(200).json({ user })
}

module.exports = { create, list, update }
