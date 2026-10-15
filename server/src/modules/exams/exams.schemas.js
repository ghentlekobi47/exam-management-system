const { z } = require('zod')
const { id } = require('../../utils/schemas')

const examFields = {
  title: z.string().trim().min(2, 'Title is too short').max(200),
  instructions: z.string().trim().max(5000).nullable(),
  durationMinutes: z.number().int().min(1).max(600),
  // Accepts ISO date strings such as "2026-10-20T09:00:00Z"
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  maxAttempts: z.number().int().min(1).max(10),
  passMark: z.number().min(0).max(100).nullable(),
  shuffleQuestions: z.boolean(),
}

const endsAfterStart = (data) => !data.startAt || !data.endAt || data.endAt > data.startAt
const endsAfterStartError = { message: 'endAt must be after startAt', path: ['endAt'] }

const createExamSchema = z
  .object({
    ...examFields,
    instructions: examFields.instructions.optional(),
    maxAttempts: examFields.maxAttempts.default(1),
    passMark: examFields.passMark.optional(),
    shuffleQuestions: examFields.shuffleQuestions.default(false),
  })
  .refine(endsAfterStart, endsAfterStartError)

const updateExamSchema = z
  .object(examFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to change')
  .refine(endsAfterStart, endsAfterStartError)

const questionText = z.string().trim().min(1, 'Question text is required').max(5000)
const points = z.number().positive().max(100).default(1)

const multipleChoiceSchema = z
  .object({
    type: z.literal('multiple_choice'),
    text: questionText,
    points,
    options: z
      .array(
        z.object({
          text: z.string().trim().min(1, 'Option text is required').max(500),
          isCorrect: z.boolean().default(false),
        }),
      )
      .min(2, 'Give at least 2 options')
      .max(6, 'Give at most 6 options'),
  })
  .refine((data) => data.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Exactly one option must be correct',
    path: ['options'],
  })

// True/false questions only need the right answer; the "True" and "False" options are created for you
const trueFalseSchema = z.object({
  type: z.literal('true_false'),
  text: questionText,
  points,
  correctAnswer: z.boolean(),
})

const questionSchema = z.discriminatedUnion('type', [multipleChoiceSchema, trueFalseSchema])

const questionParams = z.object({ id, questionId: id })

module.exports = { createExamSchema, updateExamSchema, questionSchema, questionParams }
