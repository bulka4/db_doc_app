const express = require('express')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const docs_router = require('./routes/docs')
const app = express()

mongoose.connect('mongodb://127.0.0.1/db_doc')

app.set('view engine', 'ejs')
// allow for linking .css files from 'public' folder to .ejs files
app.use(express.static('public'));
// urldencoded allows us to get access to req.body while sending a post request
app.use(express.urlencoded({extended: false}))
// this method override will allow us to use PUT method in 'form' html element
app.use(methodOverride('_method'))
// we will be using router under /docs url
app.use('/docs', docs_router)


app.listen(4000)


