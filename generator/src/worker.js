const workerpool = require('workerpool')
const { analyze } = require('./lib/analyze')
const { objectTable } = require('./formatting')
const { generateMarkdown } = require('./lib/document')
const { getSubmissionsDir } = require('./paths')
const random = require('random-seed')
const fs = require('fs')
const path = require('path')
const generate = require('../data')

function formatSubmission({
  stats1,
  stats2,
  problem,
  submission,
  evaluation
}) {
  const md =
    `# Detajet e dorëzimit

${objectTable(stats1)}

${objectTable(stats2)}

---

${problem}

---

# Kodi i dorëzuar

\`\`\`cpp
${(submission || '').trim()}
\`\`\`

---

# Vlerësimi

${evaluation}
`

  return md
}


async function evaluate({ stats1, stats2, context, shortTime }) {
  const rng = random.create(context.seed)
  const problem = generate(rng, context)
  const { document, scores, totalScore } = await analyze(context.code, problem.analyzers)
  const problemString = generateMarkdown(problem, rng, context)

  const md = formatSubmission({
    stats1,
    stats2,
    problem: problemString,
    submission: context.code,
    evaluation: document
  })

  const fileName = `${context.idSlug}-${context.nameSlug}-${shortTime}`
  const uploadDir = getSubmissionsDir(context.teacherSlug, 'eval')
  const savePath = path.join(uploadDir, fileName + '.md')

  fs.writeFile(savePath, md, err => {
    if (err) {
      console.error(`Error saving evaluated submission ${displayString}`)
      console.error(err)
    } else {
      console.log(`Saved evaluated submission ${displayString}`)
    }
  })

  return {
    scores,
    totalScore
  }
}

workerpool.worker({
  evaluate
})
