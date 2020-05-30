const { analyze } = require('@edongashi/cpp-eval')

function dataTable(data, headings) {
  let result = headings.join(' | ') + '\n' + headings.map(() => '---').join(' | ')

  for (const values of data) {
    result += '\n' + values.join(' | ')
  }

  return result
}

function formatResult({ analyzer, result }) {
  let str = `${analyzer.config.description} ` + (result.success ? 'OK ✔️' : '**FAILED** ❌')
  if (result.log) {
    str += '\n\n```\n' + result.log + '\n```'
  }

  return str
}

function formatResults({ title, results }) {
  if (!results) {
    return `### ${title}\n\nNuk mund të analizohet për shkak që mungon definimi. ❌`
  }

  return [
    `### ${title}`,
    ...results.map(formatResult)
  ].join('\n\n')
}

function getScore({ results }) {
  if (!results) {
    return 0
  }

  let score = 0
  for (const { analyzer, result } of results) {
    if (result.success) {
      if (typeof analyzer.config.scorePlus === 'number') {
        score += analyzer.config.scorePlus
      }
    } else {
      if (typeof analyzer.config.scoreMinus === 'number') {
        score -= analyzer.config.scoreMinus
      }
    }
  }

  return score
}

function summaryTable({ totalScore, scores, all }) {
  return dataTable(
    [
      ...all.map(({ title }, i) => [title, scores[i]]),
      ['Total', totalScore]
    ],
    ['Kërkesa', 'Pikët']
  )
}

async function run(source, analysis) {
  const result = await analyze(source, analysis)

  const all = [
    { title: 'Përgjithshme', results: result.root },
    ...Object.entries(result.declarations).map(([key, value]) => {
      return { title: `Funksioni ${key}`, results: value }
    })
  ]

  const scores = all.map(getScore)
  const totalScore =
    Math.max(
      Math.min(
        15,
        scores.reduce((a, b) => a + b)),
      0)

  return {
    document: '### Përmbledhje\n\n'
      + summaryTable({ scores, totalScore, all })
      + '\n\n'
      + all.map(formatResults).join('\n\n'),
    scores,
    totalScore
  }
}

module.exports = {
  analyze: run
}
