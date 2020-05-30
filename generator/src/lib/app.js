const express = require('express')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const useragent = require('express-useragent')
const serveIndex = require('serve-index')
const { render } = require('./render')
const { STATIC, getSubmissionsDir } = require('../paths')
const { password } = require('../config')
const session = require('express-session')
const sha1 = require('sha1')
const flash = require('flash')

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

const authenticate = (req, res, next) => {
  if (req.session.authenticated) {
    return next()
  } else if (req.query.hash && sha1(password + req.path) === req.query.hash) {
    return next()
  } else {
    res.redirect('/login')
  }
}

function createApp(init) {
  const app = express()
  const uploadsDir = getSubmissionsDir()
  const accessLogStream = fs.createWriteStream(path.join(uploadsDir, 'access.log'), { flags: 'a' })
  app.use(session({
    secret: 'fiek2018',
    resave: false,
    saveUninitialized: false
  }))

  app.use(flash())
  app.use(morgan('combined', { stream: accessLogStream, skip }))
  app.use(express.urlencoded({ extended: true }))
  app.use(useragent.express())
  app.use('/static', express.static(STATIC))

  app.get('/*', function (req, res, next) {
    req.session.flash = []
    next()
  })

  function renderMarkdown(req, res, next) {
    if (req.path.match(/\.md$/i) && req.method === 'GET') {
      fs.readFile(path.join(uploadsDir, req.path), 'utf8', function (err, content) {
        if (err) {
          console.error(err)
          return next()
        }

        const sharing = req.protocol + '://' + req.get('Host') + '/submissions' + req.path + '?hash=' + sha1(password + req.path)

        res
          .type('text/html')
          .status(200)
          .send(render(`${content}\n\n---\n\n[Sharing link](${sharing})`))
      })
    } else {
      return next()
    }
  }

  const loginPath = path.join(STATIC, 'login.html')

  app.get('/login', (req, res) => {
    res.sendFile(loginPath)
  })

  app.post('/login', (req, res) => {
    if (req.body.password === password) {
      req.session.authenticated = true
      return res.redirect('/submissions')
    } else {
      return res.redirect('/login')
    }
  })

  app.use('/submissions',
    authenticate,
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
