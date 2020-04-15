const { exec } = require('child_process')
const path = require('path')

function stringify(val) {
  if (typeof val === 'string') {
    return val
  } else if (Buffer.isBuffer(val)) {
    return val.toString('utf8')
  } else {
    return ''
  }
}

async function compile(file) {
  return new Promise(resolve => {
    exec(
      `g++ -Wall -Wextra -Wfatal-errors -fsyntax-only "${path.basename(file)}"`,
      { cwd: path.dirname(file), timeout: 5000 },
      (error, stdout, stderr) => {
        const log = (stringify(stdout) + '\n' + stringify(stderr)).trim()
        const status = error ? stderr ? 'FAILED' : 'UNKNOWN' : 'OK'
        resolve({ status, log })
      })
  })
}

module.exports = {
  compile
}
