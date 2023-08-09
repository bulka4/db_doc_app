const mongoose = require('mongoose')

const col_schema = new mongoose.Schema({
    columnName: {
        type: String,
        required: true
    },
    columnDescription: {
        type: String
    }
}, {_id: false})

const doc_schema = new mongoose.Schema({
    tableId: {
        type: Number,
        required: true
    },
    tableName: {
        type: String,
        required: true
    },
    tableDescription: {
        type: String
    },
    columns: [col_schema]
})

module.exports = mongoose.model('doc', doc_schema)