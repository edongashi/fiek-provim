const path = require('path')
const fs = require('fs')
const { salt } = require('./config')

const ROOT = path.resolve(__dirname, '..')
const STATIC = path.resolve(ROOT, 'static')
const UPLOADS = path.resolve(ROOT, 'uploads', salt)

function getDir(...paths) {
  const dirPath = path.resolve(ROOT, ...paths)

  try {
    fs.mkdirSync(dirPath, { recursive: true })
  } catch (e) {
    console.error(e)
  }

  return dirPath
}

function getSubmissionsDir(...paths) {
  return getDir(UPLOADS, ...paths)
}

module.exports = {
  ROOT,
  STATIC,
  UPLOADS,
  getSubmissionsDir
}
