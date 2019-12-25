const express = require('express')
const path = require('path')
const slugify = require('slugify')
const fs = require('fs')
const random = require('random-seed')
const moment = require('moment')
const { table, source, html } = require('./document')
const { logAction } = require('./logging')

const salt = slugify(process.argv[2] || '', { lower: true, remove: /[*+~.()'"!:@]/g })

if (salt) {
  console.log(`Using salt '${salt}'.`)
} else {
  console.error('Error: No salt given.')
  return
}

const uploadDir = path.join(__dirname, 'uploads', salt)
fs.mkdirSync(uploadDir, { recursive: true })

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use('/static', express.static('static'))

function formatName(name) {
  name = (name || '').trim().replace(/\s+/g, ' ')
  const id = slugify(name, { lower: true, remove: /[*+~.()'"!:@]/g })
  const seed = salt + '-' + id + '-rng'
  const rng = random.create(seed)
  return { name, id, seed, rng }
}

app.get('/description', (req, res) => {
  const { name, id, seed, rng } = formatName(req.query.name)
  if (!name) {
    return res.redirect('/')
  }

  logAction(req.ip, name, 'description')

  const src =
    html({ name, id, seed, rng })
      .replace('<p>__DATA_AFTER__</p>', `
<form method="POST" action="/submission" autocomplete="off">
  <h1>Dorëzimi i zgjidhjes</h1>
  <input type="hidden" name="name" value="${name}" />
  Kodi i zgjidhjes
  <br />
  <textarea rows="10" name="code" required autocomplete="off" autocorrect="off" autocapitalize="off"
    spellcheck="false" required></textarea>
  <br />
  <input type="submit" value="Dërgo" />
</form>
`)

  res
    .type('text/html')
    .status(200)
    .send(src)
})

app.get('/markdown', (req, res) => {
  const { name, id, seed, rng } = formatName(req.query.name)
  if (!name) {
    return res.redirect('/')
  }

  logAction(req.ip, name, 'markdown')

  const src = source({ name, id, seed, rng })
  res
    .type('text/plain')
    .status(200)
    .send(src)
})

app.post('/submission', (req, res) => {
  const { name: rawName, code } = req.body
  const { name, id, seed, rng } = formatName(rawName)

  if (!name) {
    return res.redirect('/')
  }

  logAction(req.ip, name, 'submission')

  const now = moment()
  const longTime = now.format('DD/MM/YY HH:mm:ss')
  const shortTime = now.format('HH-mm-ss')

  const stats = {
    Name: name,
    Time: longTime,
    IP: req.ip,
    Seed: seed
  }

  const submission =
    `# Submission details

${table(stats)}

---

${source({ name, id, seed, rng })}

---

# Solution

\`\`\`cpp
${(code || '').trim()}
\`\`\`
`

  const fileName = path.join(uploadDir, `${id}-${shortTime}.md`)
  fs.writeFile(fileName, submission, (err) => {
    if (err) {
      console.error(`Error while handling request for ${name} at ${shortTime} from ${req.ip}`)
      console.error(err)
    } else {
      console.log(`Saved entry for ${name} at ${shortTime} from ${req.ip}`)
    }
  })

  res.redirect('/description?name=' + encodeURIComponent(name))
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(3000)
