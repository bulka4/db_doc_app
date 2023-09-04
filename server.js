if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const express = require('express')
const app = express()
const methodOverride = require('method-override')
const mongoose = require('mongoose')

const Users = require('./models/users')
const UsersCopy = require('./models/users_copy')
const Docs = require('./models/docs')
const DocsCopy = require('./models/docs_copy')

const docsRouter = require('./routes/docs_route')
const loginRouter = require('./routes/login_route')

const flash = require('express-flash')
const session = require('express-session')
const initializePassport = require('./passport-config')
const passport = require('passport')

initializePassport(
    passport,
    async email => await Users.findOne({email: email}),
    async id => await Users.findById(id)
)

mongoose.connect('mongodb://127.0.0.1/db_doc')

app.set('view engine', 'ejs')
// allow for linking .css files from 'public' folder to .ejs files
app.use(express.static('public'));
// urldencoded allows us to get access to req.body while sending a post request
app.use(express.urlencoded({extended: false}))

// app.use(express.json())

// this method override will allow us to use PUT method in 'form' html element
app.use(methodOverride('_method'))
// thanks to the flash we can access 'messages' variable inside ejs files
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {_expires: 30 * 60 * 1000} // session expires after 30 minutes and user needs to log in again
}))
app.use(passport.initialize())
app.use(passport.session())
// we will be using docsRouter under /docs url
app.use('/docs', docsRouter)
app.use('/', loginRouter)

app.get('/', checkNotAuthenticated, (req, res) => {
    res.redirect('/login')
})

// we want to use port 80 because then we don't need to write a port number in the url,
// so instead of writting url 'db_doc.com:port_number' we just need to write 'db_doc.com'
app.listen(80)

// make a copy of the data in MongoDB every 24h in case we accidentally loose the oryginal data
copyData(24)



// savingInterval argument indicates number of hours every which we will be creating a copy
// of the data from MongoDB 
async function copyData(savingInterval){
    while (true){
        const docs = await Docs.find()
        const users = await Users.find()

        let collections = await mongoose.connection.db.listCollections().toArray()
        for (let [index, value] of collections.entries()){
            collections[index] = collections[index].name
        }
        
        // drop collections with a copy of a data if they exist
        if (collections.includes('users_copy'))
            mongoose.connection.db.dropCollection('users_copy')
        if (collections.includes('docs_copy'))
            mongoose.connection.db.dropCollection('docs_copy')

        // save a copy of a data
        UsersCopy.insertMany(users)
        DocsCopy.insertMany(docs)

        await sleep(1000 * 60 * 60 * savingInterval)
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// function for checking if user has logged in and is authenticated
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/docs/0/table')
    }

    next()
}