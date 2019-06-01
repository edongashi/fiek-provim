const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const commander = require('commander')
const rimraf = require('rimraf')

const hexTable = [
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'
]

function makeTerminal(v) {
  if (typeof v === 'function') {
    return [v()]
  }

  return [v]
}

function makeOperator(op, left, right) {
  return [op, left, right]
}

function asString(node) {
  if (!node) {
    return '?'
  }

  if (node && node.value) {
    return node.value.toString()
  } else {
    return node.toString()
  }
}

function serializeNode(node, parens = false, contextPriority = -1, depth = 0) {
  const isTerminal = node.length === 1
  if (isTerminal) {
    return asString(node[0])
  } else {
    const [op, left, right] = node
    let priority = 0
    if (op.priority) {
      priority = op.priority
    }

    function wrap(x) {
      if (depth === 0) {
        return x
      }

      if (parens || priority < contextPriority) {
        return '(' + x + ')'
      } else {
        return x
      }
    }

    return wrap(
      serializeNode(left, parens, priority, depth + 1)
      + asString(op)
      + serializeNode(right, parens, priority, depth + 1))
  }
}

class Random {
  bin(len, chunksize = 0) {
    let str = ''
    for (let i = 0; i < len; i++) {
      str += this.int(2)
      if (chunksize > 0 && i < len - 1 && i % chunksize === 0) {
        str += ' '
      }
    }

    return str
  }

  choice(array = []) {
    return array[this.int(array.length)]
  }

  hex(len, chunksize = 0) {
    const result = _.times(len, _ => this.choice(hexTable))
    if (chunksize > 0) {
      return _.chunk(result, chunksize).map(x => x.join('')).join(' ')
    } else {
      return result.join('')
    }
  }

  bool() {
    return this.int(2) === 1
  }

  shuffle(array) {
    return _.sortBy(array, () => Math.random())
  }

  ast(nodes, ops, config = {}) {
    const addedNodes = []
    const addedOps = []

    if (typeof config === 'number') {
      config = { maxOps: config }
    }

    const {
      maxOps = 1,
      maxDepth = 3,
      parens = true
    } = config

    let i = 0
    const makeNode = (depth = 0) => {
      if (i >= maxOps || depth >= maxDepth) {
        let node = this.choice(nodes)
        if (addedNodes.includes(node)) {
          node = this.choice(nodes)
        }

        if (addedNodes.includes(node)) {
          node = this.choice(nodes)
        }

        if (!addedNodes.includes(node)) {
          addedNodes.push(node)
        }

        return makeTerminal(node)
      } else {
        let op = this.choice(ops)
        if (addedOps.includes(op)) {
          op = this.choice(ops)
        }

        if (!addedOps.includes(op)) {
          addedOps.push(op)
        }

        i++
        const [left, right] = this.shuffle([makeNode(depth + 1), makeNode(depth + 1)])
        return makeOperator(op, left, right)
      }
    }

    const root = makeNode()
    return serializeNode(root, parens)
  }

  id() {
    return this.hex(16)
  }

  exp2(min, max) {
    return 2 ** this.int(min, max)
  }

  float(min, max) {
    return Math.random() * (max - min) + min
  }

  int(min, max) {
    if (typeof max === 'undefined') {
      max = min
      min = 0
    }

    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min
  }

  seq(len, min, max) {
    _.times(len, () => this.int(min, max))
  }
}

function parse(args) {
  return new commander.Command()
    .option('-p, --purge', 'Purge output directory first')
    .option('-f, --file <file>', 'Source file')
    .option('-r, --repeat [times]', 'Files to create', 1)
    .option('-o, --outdir [dir]', 'Output directory', 'compiled')
    .option('-n, --name [name]', 'Output file name', '@{basename}-@{id}@{extension}')
    .option('-c, --cmd [cmd]', 'Shell command or script to apply to output')
    .parse(args)
}

async function main(args) {
  const program = parse(process.argv)
  const {
    file,
    name,
    repeat,
    outdir,
    cmd,
    purge
  } = program
  const resolvedOutdir = path.resolve(outdir)
  if (!file) {
    if (purge) {
      rimraf.sync(resolvedOutdir)
      return
    }

    program.help()
    return
  }

  const resolvedFile = path.resolve(file)
  const extension = path.extname(resolvedFile)
  const filename = path.basename(resolvedFile)
  const basename = path.basename(resolvedFile, extension)

  if (purge) {
    try {
      rimraf.sync(resolvedOutdir + '/*')
    } catch (e) {
      // ignored
    }
  }

  try {
    fs.mkdirSync(resolvedOutdir)
  } catch (e) {
    // ignored
  }

  const options = {
    evaluate: /<\?([\s\S]+?)\?>/g,
    interpolate: /[\$@]\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,
    escape: /<\?=([\s\S]+?)\?>/g,
    imports: {
      random: new Random(),
      file: resolvedFile,
      filename,
      basename,
      extension,
      repeat,
      outdir: resolvedOutdir
    }
  }

  const compiledTemplate = _.template(
    fs.readFileSync(resolvedFile, 'utf8'),
    options)

  const cmdTemplate = cmd
    ? _.template(cmd, options)
    : () => null

  const nameTemplate = name
    ? _.template(name, options)
    : ({ id }) => id.toString() + extension

  for (let i = 1; i <= repeat; i++) {
    const id = i
    let data = { id }
    const outfile = path.join(resolvedOutdir, nameTemplate(data))
    const outextension = path.extname(outfile)
    const outfilename = path.basename(outfile)
    const outbasename = path.basename(outfile, extension)
    data = {
      id,
      outfile,
      outfilename,
      outbasename,
      outextension
    }

    const result = compiledTemplate(data)
    fs.writeFileSync(outfile, result)

    const cmdstr = cmdTemplate(data)
    if (cmdstr) {
      console.debug(`Running ${cmdstr}`)
      await exec(cmdstr)
    }
  }
}

function withTryCatch(fn) {
  return async function (...args) {
    try {
      await fn(...args)
    } catch (e) {
      console.error(e.message)
    }
  }
}

exports.Random = Random
exports.program = parse
exports.main = withTryCatch(main)

if (module === require.main) {
  const main2 = withTryCatch(main)
  main2(process.argv)
}
