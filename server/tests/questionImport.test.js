const assert = require('node:assert/strict')
const { test } = require('node:test')
const { parseCsv } = require('../src/utils/csv')
const { parseQuestionsCsv } = require('../src/modules/exams/questionImport')

const HEADER = 'type,question,points,option_a,option_b,option_c,option_d,option_e,option_f,correct'

test('parseCsv handles quotes, commas inside quotes and Windows line endings', () => {
  const rows = parseCsv('﻿a,"b, c","say ""hi"""\r\n1,2,3\r\n')

  assert.deepEqual(rows, [
    ['a', 'b, c', 'say "hi"'],
    ['1', '2', '3'],
  ])
})

test('parseCsv reads semicolon-separated files', () => {
  assert.deepEqual(parseCsv('a;b\n1;2'), [
    ['a', 'b'],
    ['1', '2'],
  ])
})

test('imports multiple choice and true/false rows', () => {
  const csv = [
    HEADER,
    'multiple_choice,Which is an input device?,2,Monitor,Keyboard,Printer,,,,B',
    'true_false,The CPU is the brain of the computer.,,,,,,,,TRUE',
    '',
  ].join('\n')

  const questions = parseQuestionsCsv(csv)

  assert.equal(questions.length, 2)
  assert.deepEqual(questions[0], {
    type: 'multiple_choice',
    text: 'Which is an input device?',
    points: 2,
    options: [
      { text: 'Monitor', isCorrect: false },
      { text: 'Keyboard', isCorrect: true },
      { text: 'Printer', isCorrect: false },
    ],
  })
  assert.deepEqual(questions[1], {
    type: 'true_false',
    text: 'The CPU is the brain of the computer.',
    points: 1,
    correctAnswer: true,
  })
})

test('lists every bad row and imports nothing', () => {
  const csv = [
    HEADER,
    'multiple_choice,Good question,1,A1,A2,,,,,A',
    'multiple_choice,Correct letter out of range,1,A1,A2,,,,,D',
    'essay,Unknown type,1,,,,,,,A',
    'true_false,,1,,,,,,,FALSE',
  ].join('\n')

  assert.throws(
    () => parseQuestionsCsv(csv),
    (err) => {
      assert.equal(err.status, 400)
      assert.equal(err.details.rows.length, 3)
      assert.match(err.details.rows[0], /^Row 3: correct answer must be one of A, B/)
      assert.match(err.details.rows[1], /^Row 4: type must be/)
      assert.match(err.details.rows[2], /^Row 5: question/)
      return true
    },
  )
})

test('explains a multiple choice row with too few options', () => {
  assert.throws(
    () => parseQuestionsCsv(`${HEADER}\nmultiple_choice,Only one option,1,Yes,,,,,,A`),
    (err) => /^Row 2: a multiple choice question needs at least 2 options/.test(err.details.rows[0]),
  )
})

test('rejects a file without the required columns', () => {
  assert.throws(() => parseQuestionsCsv('name,email\nA,b'), /missing these columns: type, question, correct/)
})
