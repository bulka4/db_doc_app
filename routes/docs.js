const express = require('express')
const Doc = require('./../models/docs')
const router = express.Router()

router.post('/search', async (req, res) => {
    const searchedQuery = req.body.searchBar
    const docs = Doc.find()
    const model = new Model()
    await model.load_model()
    
    searchedQueryEncoded = await model.encode(searchedQuery)
    const similarity_scores = []

    docs.forEach(doc => {
        
    })

    res.redirect(`${req.body.tableId}/table`)
})

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
    const model = new Model()
    await model.load_model()

    doc.tableDescription = req.body.description
    doc.tableDescriptionEncoded = await model.encode(req.body.description)

    await doc.save()
    res.redirect(`/docs/${req.params.id}/table`)
})

router.put('/:id/columns', async (req, res) => {
    const doc = await Doc.findOne({tableId: req.params.id})
    const model = new Model()
    await model.load_model()

    Object.entries(req.body).forEach(async ([_, columnDescription], index) => {
        doc.columns[index].columnDescription = columnDescription
        doc.columns[index].columnDescriptionEncoded = await model.encode(columnDescription)
    })

    await doc.save()

    res.redirect(`/docs/${req.params.id}/columns`)
})


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

// cosine similarity for checking how similar are 2 sentence embeddings
function cos_sim(A, B){
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
};


module.exports = router