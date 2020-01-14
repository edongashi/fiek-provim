const unified = require('unified')
const remarkParse = require('remark-parse')
const remarkMath = require('remark-math')
const remarkHighlight = require('remark-highlight.js')
const remarkRehype = require('remark-rehype')
const rehypeDocument = require('rehype-document')
const rehypeKatex = require('rehype-katex')
const rehypeWrap = require('rehype-wrap')
const rehypeStringify = require('rehype-stringify')
const data = require('./data')

const NL = '\n'

function table(data) {
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

function build({ name, id, seed, rng }) {
  return resolve(data, rng, { name, id, seed })
}

function source(params) {
  return build(params)
    .replace('\\_\\_DATA_AFTER\\_\\_', '')
    .trim()
}

function html(params) {
  const src = build(params)
  return unified()
    .use(remarkParse)
    .use(remarkHighlight)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeDocument, {
      title: 'Detyra',
      css: [
        '/static/gfm.css',
        '/static/highlight.css',
        '/static/katex/katex.min.css',
        '/static/main.css'
      ]
    })
    .use(rehypeWrap, { wrapper: 'div.markdown-body' })
    .use(rehypeKatex)
    .use(rehypeStringify)
    .processSync(src)
    .toString()
}

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

module.exports = {
  table,
  source,
  html,
  dataTable
}
