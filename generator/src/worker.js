const workerpool = require('workerpool')

function evaluate({ stats1, stats2, context }) {
  console.log('WORKER!')
  return {
    scores: [0],
    totalScore: 0
  }
}

workerpool.worker({
  evaluate
})
