const slugify = require('slugify')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const logsDir = path.join(__dirname, 'logs')

try {
  fs.mkdirSync(logsDir)
} catch (e) {

}

const salt = slugify(process.argv[2] || '', { lower: true, remove: /[*+~.()'"!:@]/g }) || 'logs'
const logPath = path.join(logsDir, salt + '.json')

const db = low(new FileSync(logPath))

db
  .defaults({
    ip: {},
    name: {},
    emails: {}
  })
  .write()

function logEmail(ip, name, email) {
  if (!name || !email) {
    return
  }

  db
    .merge({
      emails: {
        [name]: {
          [ip]: email
        }
      }
    })
    .write()
}

function logAction(ip, name, action) {
  const time = moment().format('DD/MM/YY HH:mm:ss')
  console.log([ip, name, action, time])

  db
    .defaultsDeep({
      ip: { [ip]: [] },
      name: { [name]: [] }
    })
    .update(['ip', ip], x => [...x, { name, action, time }])
    .update(['name', name], x => [...x, { ip, action, time }])
    .write()
}

module.exports = {
  logEmail,
  logAction
}
