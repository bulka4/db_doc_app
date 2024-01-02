const sql_connector = require('./sql_connector')
const Docs = require('../models/dataLineageDocs')

// connecting with mongoose in this file is just for testing. I can remove it later on
const mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1/db_doc')

createDataLineageDocs(['table_00'], 'lineage_test')
console.log('done')

async function createDataLineageDocs(final_tables, data_lineage_name){
    `This function creates a data lineage document which shows how given set of tables called final_tables
    is being created. This document is being saved in the models/dataLineageDocs.js data model and it can be used by 
    routes/data_lineage_route.js file for creating data lineage visualizations`

    const data_lineage_doc = {
        dataLineageId: await Docs.count({}) + 1,
        dataLineageName: data_lineage_name,
        nodes: []
    }

    // const procedures_in_out = await proceduresInOut()
    const procedures_in_out = [
        ['table_10', 'proc_00', 'table_00'],
        ['table_11', 'proc_00', 'table_00'],
        
        ['table_20', 'proc_10', 'table_10'],
        ['table_21', 'proc_10', 'table_10'],
        
        ['table_22', 'proc_11', 'table_11'],
        ['table_23', 'proc_11', 'table_11'],
        
        ['table_30', 'proc_20', 'table_21'],
        ['table_31', 'proc_20', 'table_21']
    ]

    for (let [i, final_table] of final_tables.entries()){
        createNodes(data_lineage_doc, procedures_in_out, final_table)
        replaceNodes(data_lineage_doc)
    }

    await Docs.insertMany(data_lineage_doc)
}

function replaceNodes(data_lineage_doc){
        `This function changes positions of nodes`

        const nodes_levels = createNodesLevels(data_lineage_doc)

        let max_no_nodes = nodes_levels[0].length
        nodes_levels.forEach((x) => {
            if (x.length > max_no_nodes) max_no_nodes = x.length
        })
        
        for (let [i, level] of nodes_levels.entries()){
            if (i == 0) {
                level[0].x = 340
                level[0].y = -270 + (max_no_nodes - level.length) * 40 / 2
            } else if (i == 1) {
                level[0].x = 200
                level[0].y = -270 + (max_no_nodes - level.length) * 40 / 2
            } else {
                // check if this is a level with tables
                if (i % 2 == 0){
                    for (let [j, table_node] of level.entries()){
                        table_node.y = -270 + j * 40 + (max_no_nodes - level.length) * 40 / 2
                        table_node.x = 340 - i * 150
                    }
                } else {
                    for (let [j, proc_node] of level.entries()){
                        proc_node.y = -270 + j * 40 + (max_no_nodes - level.length) * 40 / 2
                        proc_node.x = 340 - i * 150
                    }
                }
            }
        }
}

function createNodesLevels(data_lineage_doc, nodes_levels = [], nodes_levels_values = []){
    `This function is used in the replaceNodes function.
    
    It creates a list of lists of nodes for each level which is called nodes_levels. One level is a 
    vertical set of nodes in a graph on a website.

    nodes_levels[0] is a node with the final table (at the end, on the right)
    nodels_levels[1] is the final stored procedure producing the final table
    nodes_levels[2] is a list of nodes with tables which are input for the final procedure
    and so on`

    if (nodes_levels.length == 0){
        for (let node of data_lineage_doc.nodes){
            if (node.linkedTo.length == 0){
                nodes_levels = [[node]]
                nodes_levels_values = [[node.value]]
            }
        }
        createNodesLevels(data_lineage_doc, nodes_levels, nodes_levels_values)
    }
    else {
        const new_level = []
        nodes_levels_values.push([])
        for (let node of data_lineage_doc.nodes){
            if (node.linkedTo.filter((x) => nodes_levels_values.slice(-2)[0].includes(x)).length > 0){
                new_level.push(node)
                nodes_levels_values.slice(-1)[0].push(node.value)
            }
        }

        if (new_level.length > 0) {
            nodes_levels.push(new_level)
            createNodesLevels(data_lineage_doc, nodes_levels, nodes_levels_values)
        } 
    }

    return nodes_levels
}

// function replaceNodes(data_lineage_doc, last_replaced_nodes = []){
//     `This function changes positions of nodes`

//     let nodes_to_replace = []
//     let last_replaced_nodes_values = []

//     if (last_replaced_nodes.length == 0){
//         // replace the final table
//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.length == 0){
//                 node.x = 340
//                 node.y = -270
//                 last_replaced_nodes.push(node)
//                 last_replaced_nodes_values.push(node.value)
//             }
//         }

//         // replace the procedure which creates the final table
//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.includes(last_replaced_nodes_values[0])){
//                 node.x = 200
//                 node.y = -270
//                 last_replaced_nodes = [node]
//                 last_replaced_nodes_values = [node.value]
//                 break
//             }
//         }

//         // replace tables which are an input for the procedure
//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.includes(last_replaced_nodes_values[0])){
//                 nodes_to_replace.push(node)
//             }
//         }

//         if (nodes_to_replace.length == 0) return

//         last_replaced_nodes = []
//         for (let [i, node] of nodes_to_replace.entries()){
//             node.x = 50
//             node.y = -270 + i * 40
//             last_replaced_nodes.push(node)
//         }

//         replaceNodes(data_lineage_doc, last_replaced_nodes)
//     }
//     else {
//         last_replaced_nodes.forEach((node) => {last_replaced_nodes_values.push(node.value)})

//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.filter((x) => last_replaced_nodes_values.includes(x)).length > 0){
//                 nodes_to_replace.push(node)
//             }
//         }

//         if (nodes_to_replace.length == 0) return

//         let last_replaced_nodes_min_y = last_replaced_nodes[0].y
//         for (let node of last_replaced_nodes){
//             if (node.y < last_replaced_nodes_min_y) last_replaced_nodes_min_y = node.y
//         }

//         for (let [i, node] of nodes_to_replace.entries()){
//             node.x = last_replaced_nodes[0].x - 150
//             node.y = last_replaced_nodes_min_y + i * 40
//         }

//         replaceNodes(data_lineage_doc, nodes_to_replace)
//     }
// }

function createNodes(
    data_lineage_doc, 
    procedures_in_out, 
    table, 
    x = 340, 
    y = 0, 
    procedure = undefined
){
    `This function creates nodes in the data_lineage_doc object (from the models/dataLineageDocs model) for 
    the final table, stored procedure which creates that final table and for tables which are used as an 
    input for that stored procedure
    
    procedure argument indicates a name of a procedure for which a given table in an input
    
    procedures_in_out argument is an output from the proceduresInOut function
    
    table argument is a table for which this function will find stored procedures which produce it and source tables
    which are an input for that store procedure
    
    x and y arguments are used for selecting coordinates where node will be placed on the website`

    if (procedure == undefined){
        data_lineage_doc.nodes.push({
            value: table,
            type: 'table',
            linkedTo: [],
            x: x,
            y: y
        })
    }

    let procedure_name
    for (let row of procedures_in_out){
        if (row[2] == table){
            procedure_name = row[1]
            data_lineage_doc.nodes.push({
                value: procedure_name,
                type: 'procedure',
                linkedTo: [table],
                x: x - 150,
                y: y
            })
            break
        }
    }

    let input_tables = []
    procedures_in_out.forEach((x) => {
        if (x[1] == procedure_name & !input_tables.includes(x[0]))
            input_tables.push(x[0])
    })

    if (input_tables.length == 0) return 

    // height of a column of nodes which are an input for the stored procedure
    let height = (input_tables.length - 1) * 40
    for (let [i, input_table] of input_tables.entries()){
        data_lineage_doc.nodes.push({
            value: input_table,
            type: 'table',
            linkedTo: [procedure_name],
            x: x - 300,
            y: y - (height / 2) + (i * 40)
        })
    }

    x -= 300
    y -= (height / 2)
    for (let [i, input_table] of input_tables.entries()){
        y += (i * 40)
        createNodes(
            data_lineage_doc, 
            procedures_in_out, 
            input_table, 
            x = x, 
            y = y, 
            procedure_name
        )
    }
}

async function proceduresInOut(){
    `This function creates a variable called procedures_in_out such that procedures_in_out[i][0] is an input table for the 
    i-th procedure called procedures_in_out[i][1] which inserts data into the procedures_in_out[i][2] output table`

    const [tables, views, procedures] = await getDbData()
    const procedures_in_out = []
    const input_tables = []

    for (let [procedure, script] of procedures){
        if (script == undefined) continue
        if (!script.includes('into') | !script.includes('from')) continue

        const output_table = script.split('into ')[1].split(' ')[0]

        if (!tables.includes(output_table) & !views.includes(output_table)) continue

        let script_words = script.split(' ')

        for(let [i, word] of script_words.entries()){
            if (['from', 'join'].includes(word)){
                if ((tables.includes(script_words[i + 1]) | views.includes(script_words[i + 1]))
                    & !input_tables.includes(script_words[i + 1]) 
                ){
                    input_tables.push(script_words[i + 1])
                }
            }
        }

        for (let input_table of input_tables){
            procedures_in_out.push([input_table, procedure, output_table])
        }
    }

    return procedures_in_out
}

async function getDbData(){
    `This function returns 3 variables:
    - views - list of views
    - tables - list of tables
    - procedures - list of stored procedures. procedures[i][0] is a name of the i-th procedure and procedures[i][1]
                    is the script of that procedure. 

    It collects data from the whole server (from all databases)`

    let sql = new sql_connector('DNAPROD', 'Stage')
    const databases = await sql.read_query("SELECT name FROM sys.databases")

    let tables = []
    let views = []
    let procedures = []

    for (let db of databases.recordset){
        // if (db.name != 'Stage') continue

        let tables_new = await sql.read_query(`use ${db.name} SELECT (SCHEMA_NAME(schema_id) + '.' + name) as tableName FROM sys.tables`)
        let views_new = await sql.read_query(`use ${db.name} SELECT (schema_name(schema_id) + '.' + name) as viewName FROM sys.views`)
        let procedures_new = await sql.read_query(`
            use ${db.name}
            SELECT 
                (specific_catalog + '.' + specific_schema + '.' + specific_name) as 'procedureName'
            FROM 
                ${db.name}.INFORMATION_SCHEMA.ROUTINES
            WHERE 
                ROUTINE_TYPE = 'PROCEDURE'
        `)

        // change names into a lower case
        tables_new.recordset.forEach((record, i) => {tables_new.recordset[i] = db.name + '.' + record.tableName.toLowerCase()})
        views_new.recordset.forEach((record, i) => {views_new.recordset[i] = db.name + '.' + record.viewName.toLowerCase()})
        procedures_new.recordset.forEach((record, i) => {procedures_new.recordset[i] = record.procedureName.toLowerCase()})

        // get procedures'code
        procedures_new.recordset = await Promise.all(procedures_new.recordset.map(async (procedure) => {
            const procedure_name = procedure.split('.').slice(1).join('.')
            let procedure_code = await sql.read_query(`use ${db.name} SELECT OBJECT_DEFINITION (OBJECT_ID(N'${procedure_name}')) as code`)
            procedure_code = cleanCode(procedure_code.recordset[0].code)
            return [procedure, procedure_code]
        }))

        tables = tables.concat(tables_new.recordset)
        views = views.concat(views_new.recordset)
        procedures = procedures.concat(procedures_new.recordset)
    }

    return [tables, views, procedures]
}

function cleanCode(code){
    if (code != undefined){
        return code.toLowerCase()
            .replaceAll('\n', ' ')
            .replaceAll('\t', ' ')
            .replaceAll('\r', ' ')
            .replaceAll('[', '')
            .replaceAll(']', '')
    }
    else {
        return code
    }
}
