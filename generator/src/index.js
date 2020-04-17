const { createApp } = require('./lib/app')
const { salt, port, password } = require('./config')
const {
  getIndex,
  getDescriptionHtml,
  getDescriptionMarkdown,
  postSubmission
} = require('./routes')

createApp(app => {
  console.log(`Using salt '${salt}'`)
  console.log(`Using port '${port}'`)
  console.log(`Using password '${password}'`)

  app.get('/description/raw', getDescriptionMarkdown)
  app.get('/description', getDescriptionHtml)
  app.post('/submission', postSubmission)
  app.get('*', getIndex)

  app.listen(port)
})
