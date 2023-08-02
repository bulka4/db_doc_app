const express = require('express')
const router = express.Router()

const docs = [{
    id: 0,
    table_name: 'table1',
    description: 'description1'
},
{
    id: 1,
    table_name: 'table2',
    description: 'description2'
}]

router.get('/', (req, res) => {
    res.render('index', {docs: docs})
})

router.get('/:id/table', (req, res) => {
    res.render('table', {
        docs: docs,
        selected_doc_id: req.params.id
    })
})

router.get('/:id/columns', (req, res) => {
    res.render('columns', {
        docs: docs,
        selected_doc_id: req.params.id
    })
})

module.exports = router