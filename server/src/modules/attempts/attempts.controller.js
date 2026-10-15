const attemptsService = require('./attempts.service')

// Routes under /api/exams/:id/attempts

async function start(req, res) {
  const { view, resumed } = await attemptsService.startAttempt(req.params.id, req.user)
  res.status(resumed ? 200 : 201).json({ attempt: view, resumed })
}

async function listForExam(req, res) {
  res.status(200).json(await attemptsService.listAttemptsForExam(req.params.id, req.user))
}

async function downloadCsv(req, res) {
  const { csv, filename } = await attemptsService.examResultsCsv(req.params.id, req.user)
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(csv)
}

// Route GET /api/attempts: a student's own results across all courses

async function listMine(req, res) {
  res.status(200).json({ results: await attemptsService.listMyResults(req.user) })
}

// Routes under /api/attempts/:id

async function getOne(req, res) {
  res.status(200).json({ attempt: await attemptsService.getAttempt(req.params.id, req.user) })
}

async function saveAnswer(req, res) {
  const answer = await attemptsService.saveAnswer(req.params.id, req.user, req.body)
  res.status(200).json({ answer })
}

async function submit(req, res) {
  res.status(200).json({ result: await attemptsService.submitAttempt(req.params.id, req.user) })
}

module.exports = { start, listForExam, downloadCsv, listMine, getOne, saveAnswer, submit }
