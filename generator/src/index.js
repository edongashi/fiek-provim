const { createApp } = require('./lib/app')
const { salt, port, password } = require('./config')
const {
  getIndex,
  getDescriptionHtml,
  getDescriptionMarkdown,
  postSubmission
} = require('./routes')
// const workerpool = require('workerpool')

createApp(async app => {
  console.log(`Using salt '${salt}'`)
  console.log(`Using port '${port}'`)
  console.log(`Using password '${password}'`)
  // const pool = await workerpool.pool(__dirname + '/worker.js').proxy()
  // app.use((req, _res, next) => {
  //   req.pool = pool
  //   next()
  // })

  app.get('/description/raw', getDescriptionMarkdown)
  app.get('/description', getDescriptionHtml)
  app.post('/submission', postSubmission)
  app.get('*', getIndex)

  app.listen(port)
})
