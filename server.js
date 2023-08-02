const express = require('express')
const docs_router = require('./routes/docs')
const app = express()

app.set('view engine', 'ejs')
app.use('/docs', docs_router)

app.listen(4000)