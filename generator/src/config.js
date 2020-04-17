const slugify = require('slugify')

function makeid(length) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let result = ''
  const charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return result
}

const salt = process.argv[2] || 'default'
const port = process.argv[3] || 3000
const password = process.argv[4] || makeid(6)

module.exports = {
  salt: slugify(salt, { lower: true, remove: /[*+~.()'"!:@]/g }),
  port,
  password
}
