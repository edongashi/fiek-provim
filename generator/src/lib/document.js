const { render } = require('./render')
const random = require('random-seed')

function pickOne(arr, rng) {
  return arr[rng.range(arr.length)]
}

function buildContext(childContext, baseContext, rng) {
  if (!childContext) {
    return baseContext
  }

  if (Array.isArray(childContext)) {
    return childContext.reduce((acc, ctx) => {
      return { ...acc, ...buildContext(ctx, acc, rng) }
    }, baseContext)
  }

  return Object
    .entries(childContext)
    .reduce((acc, [key, val]) => {
      return { ...acc, [key]: resolve(val, rng, acc) }
    }, baseContext)
}

function replace(text, pattern, replacement) {
  var outString = []
  var repLen = pattern.length

  while (true) {
    var idx = text.indexOf(pattern)
    if (idx === -1) {
      outString.push(text)
      break;
    }

    outString.push(text.substring(0, idx))
    outString.push(replacement)

    text = text.substring(idx + repLen)
  }

  return outString.join('');
}

function resolve(expr, rng, context = {}) {
  if (!expr) {
    return ''
  }

  if (typeof rng === 'string') {
    rng = random.create(rng)
  }

  if (typeof expr === 'function') {
    return resolve(expr(rng, context))
  }

  if (typeof expr === 'string') {
    const entries = Object.entries(context)
    entries.sort(([k1], [k2]) => k2.length - k1.length)
    return entries.reduce((acc, [key, val]) => replace(acc, '%' + key + '%', val), expr)
  }

  if (Array.isArray(expr)) {
    const [t, ...rest] = expr
    if (t === '$pick') {
      return resolve(pickOne(rest, rng), rng, context)
    }

    if (t === '$camelcase') {
      const resolved = resolve(rest[0], rng, context)
      return resolved[0].toLowerCase() + resolved.substr(1)
    }

    if (t === '$seq') {
      return rest
        .map(subexpr => resolve(subexpr, rng, context))
        .join('')
    }

    if (t === '$ctx') {
      const [ctx, ...restexpr] = rest
      const childContext = buildContext(ctx, context, rng)
      return restexpr
        .map(subexpr => resolve(subexpr, rng, childContext))
        .join('')
    }

    if (t.startsWith('$switch:')) {
      const key = t.substr('$switch:'.length)
      const option = context[key]
      const container = rest[0]
      const subexpr = option in container ? container[option] : container.$default
      return resolve(subexpr, rng, context)
    }

    return ''
  }

  if (typeof expr === 'object') {
    const newContext = buildContext(expr.$def, context, rng)

    if (typeof expr.$switch === 'string') {
      const key = expr.$switch
      const option = context[key]
      const subexpr = option in expr ? expr[option] : expr.$default
      return resolve(subexpr, rng, newContext)
    }

    if (Array.isArray(expr.$pick)) {
      return resolve(pickOne(expr.$pick, rng), rng, newContext)
    }

    return resolve(expr.$content || expr.content, rng, newContext)
  }

  return expr.toString()
}

function build(expr, rng, context) {
  return resolve(expr, rng, context)
}

function generateMarkdown(expr, rng, context) {
  return build(expr, rng, context)
    .replace('\\_\\_DATA_AFTER\\_\\_', '')
    .trim()
}

function generateHtml(expr, rng, context, header = '') {
  const src = header + build(expr, rng, context)
  return render(src)
}

module.exports = {
  generateMarkdown,
  generateHtml
}
