const unified = require('unified')
const remarkParse = require('remark-parse')
const remarkMath = require('remark-math')
const remarkHighlight = require('remark-highlight.js')
const remarkRehype = require('remark-rehype')
const rehypeDocument = require('rehype-document')
const rehypeKatex = require('rehype-katex')
const rehypeWrap = require('rehype-wrap')
const rehypeStringify = require('rehype-stringify')

function render(markdown) {
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
    .processSync(markdown)
    .toString()
}

module.exports = {
  render
}
