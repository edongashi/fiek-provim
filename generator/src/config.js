const slugify = require('slugify')

const salt = process.argv[2] || 'default'
const port = process.argv[3] || 3000

module.exports = {
  salt: slugify(salt, { lower: true, remove: /[*+~.()'"!:@]/g }),
  port
}
