const test = require('node:test')
const assert = require('node:assert/strict')
const { createCourseSchema, updateCourseSchema } = require('../src/modules/courses/courses.schemas')

test('a course can be created without a lecturer', () => {
  assert.equal(createCourseSchema.safeParse({ code: 'CS101', title: 'Intro' }).success, true)
  assert.equal(createCourseSchema.safeParse({ code: 'CS101', title: 'Intro', lecturerId: null }).success, true)
  assert.equal(createCourseSchema.safeParse({ code: 'CS101', title: 'Intro', lecturerId: 3 }).success, true)
})

test('a lecturer can be assigned or removed later', () => {
  assert.equal(updateCourseSchema.safeParse({ lecturerId: 3 }).success, true)
  assert.equal(updateCourseSchema.safeParse({ lecturerId: null }).success, true)
  assert.equal(updateCourseSchema.safeParse({ lecturerId: 0 }).success, false)
})
