const express = require('express')
const authenticate = require('../../middleware/authenticate')
const authorize = require('../../middleware/authorize')
const validate = require('../../middleware/validate')
const { idParams } = require('../../utils/schemas')
const { createUserSchema, updateUserSchema } = require('./users.schemas')
const { create, list, update } = require('./users.controller')

const router = express.Router()

// Every user-management route is admin only
router.use(authenticate, authorize('admin'))

router.post('/', validate(createUserSchema), create)
router.get('/', list)
router.patch('/:id', validate(idParams, 'params'), validate(updateUserSchema), update)

module.exports = router
