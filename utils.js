const crypto = require('crypto')

// generate unique id as 32-chars string
module.exports.generateUniqId = () => crypto.randomBytes(16).toString('hex')
