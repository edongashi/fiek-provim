const _ = require('lodash')
const path = require('path')
const fs = require('fs')

class Random {
  exp2(min, max) {
    return 2 ** this.int(min, max)
  }

  float(min, max) {
    return Math.random() * (max - min) + min
  }

  int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  seq(len, min, max) {
    _.times(len, () => this.int(min, max))
  }
}

function compile(source) {
  return _.template(source, {
    imports: {
      random: new Random()
    }
  })
}

exports.Random = Random
exports.compile = compile

if (module === require.main) {
  const [, , file, times = 1, output = 'compiled'] = process.argv
  if (!file || isNaN(times)) {
    console.log('Invalid usage.')
    return
  }

  const ext = path.extname(file) || '.txt'
  const compiledTemplate = compile(fs.readFileSync(file, 'utf8'))
  const outdir = path.join(__dirname, output)
  try {
    fs.mkdirSync(outdir)
  } catch (e) {
    // ignored
  }

  for (let i = 1; i <= times; i++) {
    const result = compiledTemplate({
      id: i
    })

    fs.writeFileSync(path.join(__dirname, output, i.toString() + ext), result)
  }
}
