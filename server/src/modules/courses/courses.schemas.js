const { z } = require('zod')
const { id } = require('../../utils/schemas')

const courseFields = {
  code: z.string().trim().toUpperCase().min(2, 'Course code is too short').max(20),
  title: z.string().trim().min(2, 'Title is too short').max(200),
  description: z.string().trim().max(5000).nullable(),
  // null means no lecturer yet
  lecturerId: z.number().int().positive().nullable(),
}

const createCourseSchema = z.object({
  ...courseFields,
  description: courseFields.description.optional(),
  lecturerId: courseFields.lecturerId.optional(),
})

const updateCourseSchema = z
  .object(courseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to change')

const enrollSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
})

const enrollmentParams = z.object({ id, studentId: id })

module.exports = { createCourseSchema, updateCourseSchema, enrollSchema, enrollmentParams }
