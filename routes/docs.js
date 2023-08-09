const express = require('express')
const Doc = require('./../models/docs')
const router = express.Router()

router.get('/', async (req, res) => {
    const docs = await Doc.find()
    res.render('index', {docs: docs})
})

router.get('/:id/table', async (req, res) => {
    const docs = await Doc.find()
    let selected_doc
    docs.forEach(doc => {
        if (doc.tableId == req.params.id){
            selected_doc = doc
        }
    })
    res.render('table', {
        docs: docs,
        selected_doc: selected_doc
    })
})

router.get('/:id/columns', async (req, res) => {
    const docs = await Doc.find()
    let selected_doc
    docs.forEach(doc => {
        if (doc.tableId == req.params.id){
            selected_doc = doc
        }
    })
    res.render('columns', {
        docs: docs,
        selected_doc: selected_doc
    })
})

router.put('/:id/table', async (req, res) => {
    const doc = await Doc.findOne({tableId: req.params.id})
    doc.tableDescription = req.body.description
    await doc.save()
    res.redirect(`/docs/${req.params.id}/table`)
})

router.put('/:id/columns', async (req, res) => {
    const doc = await Doc.findOne({tableId: req.params.id})
    Object.entries(req.body).forEach(([_, columnDescription], index) => {
        doc.columns[index].columnDescription = columnDescription
    })
    await doc.save()
    res.redirect(`/docs/${req.params.id}/columns`)
})


module.exports = router