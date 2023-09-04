const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: {
        type: String,
        default: 'newUser'
    }
}, 
{collection: 'users_copy'})

module.exports = mongoose.model('user_copy', userSchema)