const { z } = require('zod')

const saveAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  // null clears the answer
  optionId: z.number().int().positive().nullable(),
})

module.exports = { saveAnswerSchema }
