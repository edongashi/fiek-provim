const slugify = require('slugify')
const { pick } = require('lodash')
const path = require('path')
const fs = require('fs')
const { salt } = require('./config')
const { generateHtml, generateMarkdown } = require('./lib/document')
const { formatSubmission } = require('./formatting')
const { ROOT, STATIC, getSubmissionsDir } = require('./paths')
const { render } = require('./lib/render')
const { compile } = require('./compiler')
const random = require('random-seed')
const moment = require('moment')

let expr = null
let precompiled = null

const mdPath = path.join(ROOT, 'data.md')
if (fs.existsSync(mdPath)) {
  expr = fs.readFileSync(mdPath, 'utf8')
  precompiled = render(expr + '\n\n\\_\\_DATA\_AFTER\\_\\_')
} else {
  expr = require('../data')
}

function buildHtml(context) {
  if (precompiled) {
    return precompiled
  }

  return generateHtml(expr, context.rng, context)
}

function buildMarkdown(context) {
  if (precompiled) {
    return expr
  }

  return generateMarkdown(expr, context.rng, context)
}

function buildContext({ id, name, teacher }) {
  id = (id || '').replace(/\s/g, '')
  name = (name || '').trim().replace(/\s+/g, ' ')
  teacher = (teacher || '').trim()
  const idSlug = slugify(id, { lower: true, remove: /[*+~.()'"!:@]/g })
  const nameSlug = slugify(name, { lower: true, remove: /[*+~.()'"!:@]/g })
  const teacherSlug = slugify(teacher, { lower: true, remove: /[*+~.()'"!:@]/g })
  const seed = salt + '-' + idSlug + '-rng'
  const rng = random.create(seed)
  return { id, name, teacher, idSlug, nameSlug, teacherSlug, seed, rng }
}

function submitForm({ id, name, teacher }) {
  return `
  <form method="POST" action="/submission" autocomplete="off">
    <h1>Dorëzimi i zgjidhjes</h1>
    <input type="hidden" name="id" value="${id}" />
    <input type="hidden" name="name" value="${name}" />
    <input type="hidden" name="teacher" value="${teacher}" />
    Kodi i zgjidhjes
    <br />
    <textarea rows="10" name="code" required autocomplete="off" autocorrect="off" autocapitalize="off"
      spellcheck="false" required></textarea>
    <br />
    <input type="submit" value="Dërgo" />
  </form>
  `
}

const getDescriptionHtml = (req, res) => {
  const context = buildContext(req.query)
  if (!context.id || !context.name || !context.teacher) {
    return res.redirect('/')
  }

  const htmlSrc = buildHtml(context)
    .replace('<p>__DATA_AFTER__</p>', submitForm(context))

  res
    .type('text/html')
    .status(200)
    .send(htmlSrc)
}

const getDescriptionMarkdown = (req, res) => {
  const context = buildContext(req.query)
  if (!context.id || !context.name || !context.teacher) {
    return res.redirect('/')
  }

  const markdownSrc = buildMarkdown(context)

  res
    .type('text/markdown')
    .status(200)
    .send(markdownSrc)
}

const agentProps = [
  'platform',
  'os',
  'browser'
]

function fancyStatus(status) {
  switch (status) {
    case 'OK': return 'OK ✔️'
    case 'FAILED': return 'FAILED ❌'
    case 'UNKNOWN': return 'UNKNOWN ⚠️'
    default: return status
  }
}

const postSubmission = async (req, res) => {
  const context = buildContext(req.body)
  context.code = req.body.code || ''

  const now = moment()
  const longTime = now.format('DD/MM/YY HH:mm:ss')
  const shortTime = now.format('HH-mm-ss')

  const displayString = `${context.teacherSlug}/${context.idSlug}-${context.nameSlug}-${shortTime} from ${req.ip}`
  console.log(`Received submission ${displayString}`)

  if (!context.id || !context.name || !context.teacher) {
    return res.redirect('/')
  }

  let compilation = { status: 'UNKOWN', log: '' }
  const fileName = `${context.idSlug}-${context.nameSlug}-${shortTime}`

  const commonDir = getSubmissionsDir('common')
  const sourceSavePath = path.join(commonDir, fileName + '.cpp')
  try {
    await fs.promises.writeFile(sourceSavePath, context.code, 'utf8')
    compilation = await compile(sourceSavePath)
    console.log(`Compilation ${compilation.status} for ${displayString}`)
  } catch (e) {
    console.error(`Error saving/compiling source ${displayString}`)
    console.error(e)
  }

  compilation.status = fancyStatus(compilation.status)

  const stats1 = {
    ID: context.id,
    Name: context.name,
    Teacher: context.teacher,
    Time: longTime,
    Compilation: compilation.status
  }

  const stats2 = {
    IP: req.ip,
    Seed: context.seed,
    ...pick(req.useragent, agentProps)
  }

  const submission = formatSubmission(stats1, stats2, compilation, buildMarkdown(context), context.code)

  const uploadDir = getSubmissionsDir(context.teacherSlug)
  const savePath = path.join(uploadDir, fileName + '.md')

  fs.writeFile(savePath, submission, err => {
    if (err) {
      console.error(`Error saving submission ${displayString}`)
      console.error(err)
    } else {
      console.log(`Saved submission ${displayString}`)
    }
  })

  const encodedName = encodeURIComponent(context.name)
  const encodedId = encodeURIComponent(context.id)
  const encodedTeacher = encodeURIComponent(context.teacher)
  res.redirect(`/description?name=${encodedName}&id=${encodedId}&teacher=${encodedTeacher}`)
}

const indexPath = path.join(STATIC, 'index.html')

const getIndex = (req, res) => {
  res.sendFile(indexPath)
}

module.exports = {
  getIndex,
  getDescriptionHtml,
  getDescriptionMarkdown,
  postSubmission
}
