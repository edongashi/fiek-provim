const NL = '\n'

function objectTable(data) {
  const kvs = Object.entries(data)
  const keys = kvs.map(([k, v]) => k).join(' | ')
  const separator = kvs.map(() => '---').join(' | ')
  const values = kvs.map(([k, v]) => v).join(' | ')
  return keys + NL + separator + NL + values
}

function dataTable(data, headings, keys) {
  let result = headings.join(' | ') + NL + headings.map(() => '---').join(' | ')

  for (const entry of data) {
    const values = keys.map(key => entry[key] || '')
    result += NL + values.join(' | ')
  }

  return result
}

function formatSubmission(stats1, stats2, problem, solution) {
  const submission =
    `# Submission details

${objectTable(stats1)}

${objectTable(stats2)}

---

${problem}

---

# Solution

\`\`\`cpp
${(solution || '').trim()}
\`\`\`
`

  return submission
}

module.exports = {
  formatSubmission
}
