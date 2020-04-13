const express = require('express')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const useragent = require('express-useragent')
const serveIndex = require('serve-index')
const { render } = require('./render')
const { STATIC, getSubmissionsDir } = require('../paths')

function skip(req) {
  let path = req.originalUrl

  if (path.indexOf('?') > 0) {
    path = path.substr(0, path.indexOf('?'))
  }

  if (path.match(/(js|jpg|png|ico|css|woff|woff2|eot)$/ig)) {
    return true;
  }

  if (path.match(/^\/submissions/i)) {
    return true
  }

  return false;
}

function createApp(init) {
  const app = express()
  const uploadsDir = getSubmissionsDir()
  const accessLogStream = fs.createWriteStream(path.join(uploadsDir, 'access.log'), { flags: 'a' })
  app.use(morgan('combined', { stream: accessLogStream, skip }))
  app.use(express.urlencoded({ extended: true }))
  app.use(useragent.express())
  app.use('/static', express.static(STATIC))

  function renderMarkdown(req, res, next) {
    if (req.path.match(/\.md$/i) && req.method === 'GET') {
      fs.readFile(path.join(uploadsDir, req.path), 'utf8', function (err, content) {
        if (err) {
          console.error(err)
          return next()
        }

        res
          .type('text/html')
          .status(200)
          .send(render(content))
      })
    } else {
      return next()
    }
  }

  app.use('/submissions',
    renderMarkdown,
    express.static(uploadsDir),
    serveIndex(uploadsDir, { icons: true }),
    (req, res) => res.sendStatus(404))

  init(app)
  return app
}

module.exports = {
  createApp
}
