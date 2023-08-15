if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const express = require('express')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const User = require('./models/users')
const docsRouter = require('./routes/docs_route')
const loginRouter = require('./routes/login_route')
const app = express()
const flash = require('express-flash')
const session = require('express-session')

const initializePassport = require('./passport-config')
const passport = require('passport')
initializePassport(
    passport,
    async email => await User.findOne({email: email}),
    async id => await User.findById(id)
)

mongoose.connect('mongodb://127.0.0.1/db_doc')

app.set('view engine', 'ejs')
// allow for linking .css files from 'public' folder to .ejs files
app.use(express.static('public'));
// urldencoded allows us to get access to req.body while sending a post request
app.use(express.urlencoded({extended: false}))
app.use(express.json())
// this method override will allow us to use PUT method in 'form' html element
app.use(methodOverride('_method'))
// thanks to the flash we can access 'messages' variable inside ejs files
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
// we will be using docsRouter under /docs url
app.use('/docs', docsRouter)
app.use('/', loginRouter)


app.listen(4000)


