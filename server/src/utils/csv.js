// Reads CSV text into rows of cells. Handles quoted cells ("a, b"), doubled quotes ("say ""hi"""),
// Windows line endings, and the semicolon separator Excel uses in some countries.
function parseCsv(text) {
  const input = text.replace(/^﻿/, '')
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ''
  const separator = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === separator) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

module.exports = { parseCsv }
