// loading list of tables and columns to the 'db_doc' mongodb database

const mongoose = require('mongoose')
const Doc = require('./../models/docs')

const sql = require('mssql/msnodesqlv8')
const config = {
    database: 'Stage',
    server: 'DNAPROD',
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true
    }
}

mongoose.connect('mongodb://127.0.0.1/db_doc')

clear_collection(Doc)

const query = 'SELECT top(10000) table_name, column_name FROM INFORMATION_SCHEMA.COLUMNS'
load_tables(query)


// functions
async function clear_collection(collection){
    await collection.deleteMany({})
}

async function load_tables(query){
    const pool = await sql.connect(config)
    const result = await pool.request().query(query)

    let actual_table_name = result.recordset[0].table_name
    let index = 0
    let docs = []
    let doc = {
        table_id: index,
        table_name: actual_table_name,
        columns: []
    }
    
    result.recordset.forEach((record) => {
        if (record.table_name == actual_table_name){
            doc.columns.push({column_name: record.column_name})
        } else {
            docs.push(doc)
            index += 1
            actual_table_name = record.table_name
            doc = {
                table_id: index,
                table_name: record.table_name,
                columns: [{column_name: record.column_name}]
            }
        }
    })
    docs.push(doc)
    await Doc.insertMany(docs)
    process.exit()
}
