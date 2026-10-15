const express = require('express')
const authenticate = require('../../middleware/authenticate')
const validate = require('../../middleware/validate')
const { idParams } = require('../../utils/schemas')
const { saveAnswerSchema } = require('./attempts.schemas')
const attempts = require('./attempts.controller')

const router = express.Router()

router.use(authenticate)

// A student's own results across every course
router.get('/', attempts.listMine)

// Students: questions while answering, score afterwards. Staff: full breakdown.
router.get('/:id', validate(idParams, 'params'), attempts.getOne)
router.put('/:id/answers', validate(idParams, 'params'), validate(saveAnswerSchema), attempts.saveAnswer)
router.post('/:id/submit', validate(idParams, 'params'), attempts.submit)

module.exports = router
