const express = require('express')
const Doc = require('../models/docs')
const router = express.Router()


router.get('/', checkAuthenticated, async (req, res) => {
    res.redirect('/docs/0/table')
})

// get request for viewing tables descriptions
router.get('/:id/table', checkAuthenticated, async (req, res) => {
    const docs = await Doc.find()
    const searchedQuery = if_undefined(req.query.searchedQuery, '')
    // find for which table documentation is actually being displayed
    const selected_doc = find_selected_doc(docs, req.params.id)
    // sort documents such that at the top are documents with table or column description
    // with a meaning the most similar to the searched query from search engine
    const sortedDocs = await sortDocs(searchedQuery, docs)

    res.render('table', {
        docs: sortedDocs,
        selected_doc: selected_doc,
        searchedQuery: searchedQuery
    })
})

// get request for viewing columns descriptions
router.get('/:id/columns', checkAuthenticated, async (req, res) => {
    const docs = await Doc.find()
    const searchedQuery = if_undefined(req.query.searchedQuery, '')
    const selected_doc = find_selected_doc(docs, req.params.id)
    const sortedDocs = await sortDocs(searchedQuery, docs)

    res.render('columns', {
        docs: sortedDocs,
        selected_doc: selected_doc,
        searchedQuery: searchedQuery
    })
})

// put request for saving table description
router.put('/:id/table', async (req, res) => {
    const doc = await Doc.findOne({tableId: req.params.id})
    const searchedQuery = if_undefined(req.query.searchedQuery, '')
    const model = new Model()

    await model.load_model()

    doc.tableDescription = req.body.description
    doc.tableDescriptionEncoded = await encode(req.body.description, 5, model)
    
    await doc.save()
    if (searchedQuery != '')
        res.redirect(`/docs/${req.params.id}/table?searchedQuery=${searchedQuery}`)
    else
        res.redirect(`/docs/${req.params.id}/table`)
})

// put request for saving columns description
router.put('/:id/columns', async (req, res) => {
    const doc = await Doc.findOne({tableId: req.params.id})
    const searchedQuery = if_undefined(req.query.searchedQuery, '')
    const model = new Model()
    
    await model.load_model()

    let column
    for (let [index, [_, columnDescription]] of Object.entries(req.body).entries()){
        column = doc.columns[index]

        column.columnDescription = columnDescription
        column.columnDescriptionEncoded = await encode(columnDescription, 5, model)
    }
    await doc.save()
    if (searchedQuery != '')
        res.redirect(`/docs/${req.params.id}/columns?searchedQuery=${searchedQuery}`)
    else
        res.redirect(`/docs/${req.params.id}/columns`)
})

// post request for searching through tables and columns descriptions
// it redirects to the page with table description
router.post('/table/search', async (req, res) => {
    const searchedQuery = req.body.searchBar
    if (searchedQuery != '')
        res.redirect(`/docs/${req.body.tableId}/table?searchedQuery=${searchedQuery}`)
    else
        res.redirect(`/docs/${req.body.tableId}/table`)
})

// post request for searching through tables and columns descriptions
// it redirects to the page with columns description
router.post('/columns/search', async (req, res) => {
    const searchedQuery = req.body.searchBar
    if (searchedQuery != '')
        res.redirect(`/docs/${req.body.tableId}/columns?searchedQuery=${searchedQuery}`)
    else
        res.redirect(`/docs/${req.body.tableId}/columns`)
})


// model for search engine
class Model{
    async load_model(){
        // loading a model in the ONNX format prepared by the script ml_model/model_preparation.py
        const { AutoModel, AutoTokenizer, env } = await import('@xenova/transformers')
        // path indicating where is the model which we want to load
        env.localModelPath = __dirname + '/../ml_model/models/model'
        this.tokenizer = await AutoTokenizer.from_pretrained('')
        this.model = await AutoModel.from_pretrained('')
        
        return [this.model, this.tokenizer]
    }

    async encode(inputs){
        // encode input text
        inputs = await this.tokenizer(inputs)
        let result = await this.model(inputs)
        result = Array.from(result.last_hidden_state.data)

        //reshaping result into a matrix of shape (sequence_length, out_dim)
        // out_dim is a dimension of a vector returned by a model for each input token
        result.reshape(result.length / 768, 768)

        // mean pooling
        let sum = result[0]
        for (let row of result.slice(1)){
            sum = sum.map((num, idx) => {
                return num + row[idx]
            })
        }
        result = sum.map(value => value / result.length)

        return result
    }
}


// divide text into chunks consisting of chunkSize words and encode each of them
async function encode(text, chunkSize, model){
    let textEncoded = []

    if (text == '') {
        return textEncoded
    }
    else {
        const textSplitted = text.split(' ')
        // we divide table description into chunks each containing chunkSize words
        let textChunkEncoded
        for (let i = 0; i <= textSplitted.length; i += chunkSize){
            textChunkEncoded = await model.encode(textSplitted.slice(i, i + chunkSize).join(' '))
            textEncoded.push(textChunkEncoded)
        }

        return textEncoded
    }
}


// cosine similarity for checking how similar are 2 sentence embeddings
function cos_sim(A, B){
    if (A.length == 0 | B.length == 0) return 0

    var dotproduct = 0;
    var mA = 0;
    var mB = 0;

    for(var i = 0; i < A.length; i++) {
        dotproduct += A[i] * B[i];
        mA += A[i] * A[i];
        mB += B[i] * B[i];
    }

    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    var similarity = dotproduct / (mA * mB);

    return similarity;
}


// function for reshaping 1d array into 2d array
Array.prototype.reshape = function(rows, cols) {
    var copy = this.slice(0); // Copy all elements.
    this.length = 0; // Clear out existing array.
  
    for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
            var i = r * cols + c;
            if (i < copy.length) {
            row.push(copy[i]);
            }
        }
        this.push(row);
    }
}


// sorting documents based on searched query typed in to search engine such that at the top are
// documents with table or column description with the most similart meaning to the searched query
async function sortDocs(searchedQuery, docs){
    const model = new Model()
    await model.load_model()

    searchedQueryEncoded = await model.encode(searchedQuery)

    if (searchedQuery == '') return docs

    // similarityScores[i] is a similarity score for the table with id = i
    const similarityScores = {}

    docs.forEach((doc, index) => {
        similarityScores[index] = []
        if (doc.tableDescriptionEncoded.length == 0) similarityScores[index].push(0)
        else {
            doc.tableDescriptionEncoded.forEach(vector => {
                similarityScores[index].push(cos_sim(vector, searchedQueryEncoded))
            })
        }
        doc.columns.forEach(column => {
            if (column.columnDescriptionEncoded.length == 0) similarityScores[index].push(0)
            else {
                column.columnDescriptionEncoded.forEach(vector => {
                    similarityScores[index].push(cos_sim(vector, searchedQueryEncoded))
                })
            }
        })
        similarityScores[index] = Math.max(...similarityScores[index])
    })

    // sort descending similarityScores
    const sortable = []
    for (let key in similarityScores){
        sortable.push([similarityScores[key], key])
    }
    sortable.sort((a, b) => {return b[0] - a[0]})

    // sorting docs
    const sortedDocs = []
    for (let value of sortable) sortedDocs.push(await Doc.findOne({tableId: value[1]}))

    return sortedDocs
}


function find_selected_doc(docs, tableId){
    let selected_doc
    docs.forEach(doc => {
        if (doc.tableId == tableId){
            selected_doc = doc
        }
    })

    return selected_doc
}


function if_undefined(x, y){
    if (x != undefined) return x
    else return y
}

// check if user is authenticated (if he has logged in)
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    return res.redirect('/login')
}


module.exports = router