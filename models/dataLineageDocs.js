const mongoose = require('mongoose')

const nodeSchema = new mongoose.Schema(
    {
        value: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        x: Number,
        y: Number
    }
)

const linkSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            required: true
        },
        target: {
            type: String,
            required: true
        }
    }
)

const dataLineageSchema = new mongoose.Schema(
    {
        dataLineageId: {
            type: Number,
            required: true
        },
        dataLineageName: {
            type: String,
            required: true
        },
        nodes: [nodeSchema],
        links: [linkSchema]
    },
    {collection: 'dataLineageDocs'}
)

module.exports = mongoose.model('dataLineageDoc', dataLineageSchema)