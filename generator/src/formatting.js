const NL = '\n'

function objectTable(data) {
  const kvs = Object.entries(data)
  const keys = kvs.map(([k, v]) => k).join(' | ')
  const separator = kvs.map(() => '---').join(' | ')
  const values = kvs.map(([k, v]) => v).join(' | ')
  return keys + NL + separator + NL + values
}

function formatSubmission(stats1, stats2, compilation, problem, solution) {
  const submission =
    `# Submission details

${objectTable(stats1)}

${objectTable(stats2)}

---

${problem}

---

# Submission

Compilation status: **${compilation.status}**

\`\`\`cpp
${(solution || '').trim()}
\`\`\`

${compilation.log && `Compiler output:

\`\`\`
${compilation.log}
\`\`\`
`}`

  return submission
}

module.exports = {
  objectTable,
  formatSubmission
}
