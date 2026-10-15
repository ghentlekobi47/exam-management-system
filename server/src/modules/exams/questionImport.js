const { z } = require('zod')
const { parseCsv } = require('../../utils/csv')
const HttpError = require('../../utils/httpError')
const { questionSchema } = require('./exams.schemas')

const MAX_QUESTIONS = 200
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const TYPE_ALIASES = {
  multiple_choice: 'multiple_choice',
  'multiple choice': 'multiple_choice',
  mcq: 'multiple_choice',
  mc: 'multiple_choice',
  true_false: 'true_false',
  'true/false': 'true_false',
  'true false': 'true_false',
  tf: 'true_false',
}

const normalise = (value) => (value ?? '').trim().toLowerCase()

// Finds each column by its header name, so the columns can be in any order
function readHeader(header) {
  const names = header.map((name) => normalise(name).replace(/\s+/g, '_'))
  const find = (...candidates) => names.findIndex((name) => candidates.includes(name))

  const columns = {
    type: find('type', 'question_type'),
    text: find('question', 'text', 'question_text'),
    points: find('points', 'marks', 'score'),
    correct: find('correct', 'correct_answer', 'answer'),
    options: OPTION_LETTERS.map((letter) =>
      find(`option_${letter.toLowerCase()}`, `option${letter.toLowerCase()}`, letter.toLowerCase()),
    ),
  }

  const missing = ['type', 'question', 'correct'].filter(
    (name) => columns[name === 'question' ? 'text' : name] === -1,
  )
  if (missing.length > 0) {
    throw new HttpError(400, `The CSV is missing these columns: ${missing.join(', ')}. Use the template.`)
  }
  return columns
}

// Turns one spreadsheet row into the same shape the "add question" form sends
function rowToQuestion(cells, columns) {
  const cell = (index) => (index === -1 ? '' : (cells[index] ?? '').trim())
  const type = TYPE_ALIASES[normalise(cell(columns.type))]
  const pointsText = cell(columns.points)
  const points = pointsText === '' ? 1 : Number(pointsText)
  const correct = normalise(cell(columns.correct))

  if (!type) {
    return { error: 'type must be "multiple_choice" or "true_false"' }
  }

  if (type === 'true_false') {
    if (!['true', 'false', 't', 'f'].includes(correct)) {
      return { error: 'correct answer for a true/false question must be TRUE or FALSE' }
    }
    return { question: { type, text: cell(columns.text), points, correctAnswer: correct.startsWith('t') } }
  }

  const optionTexts = columns.options.map(cell)
  const lastFilled = optionTexts.findLastIndex((text) => text !== '')
  const options = optionTexts.slice(0, lastFilled + 1)

  if (options.some((text) => text === '')) {
    return { error: 'options must be filled in order (A, B, C…) with no gaps' }
  }
  if (options.length < 2) {
    return { error: 'a multiple choice question needs at least 2 options (option_a, option_b…)' }
  }

  const correctIndex = OPTION_LETTERS.indexOf(correct.toUpperCase())
  if (correctIndex === -1 || correctIndex >= options.length) {
    const allowed = OPTION_LETTERS.slice(0, Math.max(options.length, 1))
    return { error: `correct answer must be one of ${allowed.join(', ')}` }
  }

  return {
    question: {
      type,
      text: cell(columns.text),
      points,
      options: options.map((text, index) => ({ text, isCorrect: index === correctIndex })),
    },
  }
}

function describeIssue(issue) {
  const field = issue.path[0]
  const names = { text: 'question', points: 'points', options: 'options' }
  return names[field] ? `${names[field]}: ${issue.message}` : issue.message
}

// Reads every row and checks it. Returns the questions, or throws one error listing every bad row.
function parseQuestionsCsv(csvText) {
  const rows = parseCsv(csvText).filter((cells) => cells.some((c) => c.trim() !== ''))

  if (rows.length < 2) {
    throw new HttpError(400, 'The file has no questions. Fill in the template below the header row.')
  }

  const columns = readHeader(rows[0])
  const dataRows = rows.slice(1)

  if (dataRows.length > MAX_QUESTIONS) {
    throw new HttpError(400, `You can import at most ${MAX_QUESTIONS} questions at a time.`)
  }

  const questions = []
  const problems = []

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2 // the header is row 1 in the spreadsheet
    const { question, error } = rowToQuestion(cells, columns)

    if (error) {
      problems.push(`Row ${rowNumber}: ${error}`)
      return
    }

    const result = questionSchema.safeParse(question)
    if (!result.success) {
      problems.push(`Row ${rowNumber}: ${result.error.issues.map(describeIssue).join('; ')}`)
      return
    }
    questions.push(result.data)
  })

  if (problems.length > 0) {
    throw new HttpError(400, `${problems.length} row${problems.length === 1 ? ' has a problem' : 's have problems'}; nothing was imported`, {
      rows: problems,
    })
  }

  return questions
}

const importSchema = z.object({
  csv: z.string().min(1, 'The file is empty').max(500_000, 'The file is too large'),
})

module.exports = { parseQuestionsCsv, importSchema }
