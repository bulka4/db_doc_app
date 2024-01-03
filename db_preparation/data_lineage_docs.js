const sql_connector = require('./sql_connector')
const Docs = require('../models/dataLineageDocs')

// connecting with mongoose in this file is just for testing. I can remove it later on
const mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1/db_doc')

test()

async function test(){
    // procedures_in_out[i][0] is an input table for the i-th stored procedure procedures_in_out[i][1] which
    // creates an output table called procedures_in_out[i][2]
    // const procedures_in_out = await proceduresInOut()

    const procedures_in_out = [
        ['table_10', 'proc_00', 'table_00'],
        ['table_11', 'proc_00', 'table_00'],
        ['table_12', 'proc_00', 'table_00'],
        ['table_13', 'proc_00', 'table_00'],
        
        ['table_20', 'proc_10', 'table_10'],
        ['table_21', 'proc_10', 'table_10'],
        ['table_22', 'proc_10', 'table_10'],
        ['table_23', 'proc_10', 'table_10'],

        ['table_24', 'proc_11', 'table_11'],
        ['table_25', 'proc_11', 'table_11'],
        ['table_26', 'proc_11', 'table_11'],
        ['table_27', 'proc_11', 'table_11'],
        
        ['table_30', 'proc_20', 'table_21'],
        ['table_31', 'proc_20', 'table_21'],

        ['table_32', 'proc_21', 'table_20'],
        ['table_33', 'proc_21', 'table_20'],

        ['table_14', 'proc_01', 'table_01'],
        ['table_15', 'proc_01', 'table_01'],
        ['table_16', 'proc_01', 'table_01'],

        ['table_28', 'proc_12', 'table_14'],
        ['table_29', 'proc_12', 'table_14'],

        ['table_210', 'proc_13', 'table_16']
    ]

    // final tables are tables which are not being an input for any stored procedure
    const final_tables = []
    for (let row of procedures_in_out){
        let table = row[2]
        let isFinalTable = true
        for (let row of procedures_in_out){
            if (row[0] == table) {
                isFinalTable = false
                break
            }
        }

        if (isFinalTable & !final_tables.includes(table)) final_tables.push(table)
    }

    for (let final_table of final_tables){
        createDataLineageDocs(final_table, final_table, procedures_in_out)
    }

    console.log('done')
}

async function createDataLineageDocs(final_table, data_lineage_name, procedures_in_out){
    `This function creates a data lineage document which shows how a given table called final_table
    is being created. This document is being saved in the models/dataLineageDocs.js data model and it can be used by 
    routes/data_lineage_route.js and views/dataLineage.ejs files for creating data lineage visualizations`

    const data_lineage_doc = {
        dataLineageId: await Docs.count({}) + 1,
        dataLineageName: data_lineage_name,
        nodes: []
    }

    createNodes(data_lineage_doc, procedures_in_out, final_table)
    replaceNodes(data_lineage_doc)

    await Docs.insertMany(data_lineage_doc)
}

function replaceNodes(data_lineage_doc){
    const nodes_levels = createNodesLevels(data_lineage_doc)
    const max_x_coordinate = 370
    const max_y_coordinate = -240

    // the first iteration
    let iteration = 0
    let input_tables_lists = nodes_levels[iteration * 2 + 2]
    let procedures_nodes = nodes_levels[iteration * 2 + 1]
    // list of table nodes to which procedures from the procedures_nodes are linked to
    let output_table_nodes = []
    for (let procedure_node of procedures_nodes){
        output_table_nodes.push(findOutputNode(procedure_node, data_lineage_doc))
    }
    
    // set up positions of input tables
    let no_previous_input_tables = 0
    for (let [i, input_tables_list] of input_tables_lists.entries()){
        for (let [j, input_table_node] of input_tables_list.entries()){
            input_table_node.x = max_x_coordinate - 300 * (iteration + 1)
            input_table_node.y = max_y_coordinate + (j * 40) + (no_previous_input_tables * 40)
        }
        no_previous_input_tables = input_tables_list.length
    }

    // set up position of procedures and output tables
    no_previous_input_tables = 0
    for (let [i, procedure_node] of procedures_nodes.entries()){
        procedure_node.x = max_x_coordinate + 150 - 300 * (iteration + 1)
        procedure_node.y = max_y_coordinate + (input_tables_lists[i].length - 1) * 40 / 2 + (no_previous_input_tables * 40)

        output_table_nodes[i].x = max_x_coordinate - 300 * iteration
        output_table_nodes[i].y = max_y_coordinate + (input_tables_lists[i].length - 1) * 40 / 2 + (no_previous_input_tables * 40)

        no_previous_input_tables = input_tables_lists[i].length
    }

    iteration += 1



    // the second iteration
    input_tables_lists = nodes_levels[iteration * 2 + 2]
    procedures_nodes = nodes_levels[iteration * 2 + 1]
    // list of table nodes to which procedures from the procedures_nodes are linked to
    output_table_nodes = []
    for (let procedure_node of procedures_nodes){
        output_table_nodes.push(findOutputNode(procedure_node, data_lineage_doc))
    }

    // set up positions of input tables
    no_previous_input_tables = 0
    for (let [i, input_tables_list] of input_tables_lists.entries()){
        for (let [j, input_table_node] of input_tables_list.entries()){
            input_table_node.x = max_x_coordinate - 300 * (iteration + 1)
            input_table_node.y = max_y_coordinate + (j * 40) + (no_previous_input_tables * 40)
        }
        no_previous_input_tables = input_tables_list.length
    }

    // set up position of procedures and output tables
    no_previous_input_tables = 0
    for (let [i, procedure_node] of procedures_nodes.entries()){
        procedure_node.x = max_x_coordinate + 150 - 300 * (iteration + 1)
        procedure_node.y = max_y_coordinate + (input_tables_lists[i].length - 1) * 40 / 2 + (no_previous_input_tables * 40)

        output_table_nodes[i].x = max_x_coordinate - 300 * iteration
        output_table_nodes[i].y = max_y_coordinate + (input_tables_lists[i].length - 1) * 40 / 2 + (no_previous_input_tables * 40)

        no_previous_input_tables = input_tables_lists[i].length
    }

    // modify positions of nodes which were set up in previous iterations
    for (level_number of Array.from(Array(iteration * 2 + 1).keys(), (x) => (iteration * 2) - x)){
        // check if this is a level with table nodes
        if (level_number % 2 == 0){
            // at first we are changing positions of table nodes which are output from procedures
            for (let table_nodes_list of nodes_levels[level_number]){
                for (let table_node of table_nodes_list){
                    let input_nodes = findInputNodes(table_node, data_lineage_doc)
                    if (input_nodes.length > 0) table_node.y = input_nodes[0].y
                }
            }
        }
    }
}


function createNodesLevels(data_lineage_doc, nodes_levels = []){
    `This function is used in the replaceNodes function.
    
    It creates a list of lists of nodes for each level which is called nodes_levels. One level is a 
    vertical set of nodes in a graph on a website.

    nodes_levels[i][0] is a list of tables which are inputs for the nodes_levels[i - 1][0] procedure
    nodes_levels[i][1] is a list of tables which are inputs for the nodes_levels[i - 1][1] procedure
    and so on`

    if (nodes_levels.length == 0){
        for (let node of data_lineage_doc.nodes){
            if (node.linkedTo.length == 0){
                nodes_levels = [[[node]]]
            }
        }
        createNodesLevels(data_lineage_doc, nodes_levels)
    }
    else {
        // check if now is a level with tables
        if (nodes_levels.length % 2 == 0){
            let previous_level_procedures = nodes_levels.slice(-1)[0]
            const new_level = []

            for (let procedure of previous_level_procedures){
                let linked_nodes = findInputNodes(procedure, data_lineage_doc)
                new_level.push(linked_nodes)
            }

            nodes_levels.push(new_level)
            createNodesLevels(data_lineage_doc, nodes_levels)
        } else {
            //  this is a level with procedures
            const new_level = []
            for (let table_node of nodes_levels.slice(-1)[0].flat()){
                let linked_nodes = findInputNodes(table_node, data_lineage_doc)
                if (linked_nodes.length > 0) new_level.push(linked_nodes[0])
            }

            if (new_level.length > 0){
                nodes_levels.push(new_level)
                createNodesLevels(data_lineage_doc, nodes_levels)
            }
        }
    }

    return nodes_levels
}

function findOutputNode(node, data_lineage_doc){
    `This function finds a node to which a given node is linked`

    for (let node2 of data_lineage_doc.nodes){
        if (node.linkedTo.includes(node2.value)) return node2
    }
}

function findInputNodes(node, data_lineage_doc){
    `This function finds all nodes which are linked to a given node`
    
    const linked_nodes = []
    for (let node2 of data_lineage_doc.nodes){
        if (node2.linkedTo.includes(node.value)) linked_nodes.push(node2)
    }

    return linked_nodes
}

// function replaceNodes(data_lineage_doc){
//     `This function changes x and y coordinates of nodes inside of data_lineage_doc object`

//     // initial position of nodes
//     const nodes_levels = createNodesLevels(data_lineage_doc)
//     for (let [i, level] of nodes_levels.entries()){
//         for (let [j, node] of level.entries()){
//             node.x = 370 - i * 150
//             node.y = -240 + j * 40
//         }
//     }

//     for (let i of Array(2).keys()){
//         modifyProcedureNodesPositions(nodes_levels, data_lineage_doc)
//         modifyTableNodesPositions(nodes_levels, data_lineage_doc)
//     }
// }

// function modifyProcedureNodesPositions(nodes_levels, data_lineage_doc){
//     for (let [i, level] of nodes_levels.entries()){
//         // check if this is a level with procedures
//         if (i % 2 != 0){
//             for (let procedure_node of level){
//                 input_tables = findInputTables(procedure_node, data_lineage_doc)
                
//                 let max_input_tables_y = input_tables[0].y
//                 let min_input_tables_y = input_tables[0].y
//                 input_tables.forEach((input_table_node) => {
//                     if (input_table_node.y > max_input_tables_y) max_input_tables_y = input_table_node.y
//                     if (input_table_node.y < min_input_tables_y) min_input_tables_y = input_table_node.y
//                 })

//                 // procedure_node.y = max_input_tables_y - (input_tables.length - 1) * 40 / 2 - 20
//                 procedure_node.y = max_input_tables_y - (max_input_tables_y - min_input_tables_y) / 2
//             }
//         }
//     }
// }

// function modifyTableNodesPositions(nodes_levels, data_lineage_doc){
//     for (let [i, level] of nodes_levels.entries()){
//         // check if this is a level with tables
//         if (i % 2 == 0){
//             // fixing positions of table nodes which are being created by some stored procedure.
//             // They should be located next to the procedures which are creating them.
//             let fixed_nodes = []
//             for (let table_node of level){
//                 let source_procedure = findSourceProcedure(table_node, data_lineage_doc)
//                 if (source_procedure != undefined){
//                     table_node.y = source_procedure.y
//                     fixed_nodes.push(table_node.value)
//                 }
//             }

//             // fixing positions of table nodes which are not being created by any stored procedure
//             for (let table_node of level){
//                 if (fixed_nodes.includes(table_node.value)) continue

//                 let closest_node = closestNode(table_node, data_lineage_doc)
//                 if (Math.abs(closest_node.y - table_node.y) < 40) table_node.y = closest_node.y + 40
//             }
//         }
//     }
// }

// function closestNode(node, data_lineage_doc){
//     `This function finds the closest node in the same level 
//     (nodes are in the same level if they have the same x coordinate)`

//     const level_nodes = []
//     for (let node2 of data_lineage_doc.nodes){
//         if (node2.x == node.x) level_nodes.push(node2)
//     }

//     let closest_node = level_nodes[0]
//     for (let node2 of level_nodes){
//         if (Math.abs(node.y - node2.y) < Math.abs(closest_node.y - node2.y)) closest_node = node2
//     }

//     return closest_node
// }

// function findSourceProcedure(table_node, data_lineage_doc){
//     `Finding a procedure node which creates a given table node`

//     for (let node of data_lineage_doc.nodes){
//         if (node.linkedTo.includes(table_node.value)) return node
//     }
// }

// function findInputTables(procedure_node, data_lineage_doc){
//     `Finding input tables (nodes) for a procedure`

//     const input_tables = []
//     for (let node of data_lineage_doc.nodes){
//         if (node.linkedTo.includes(procedure_node.value)) input_tables.push(node)
//     }

//     return input_tables
// }

// function createNodesLevels(data_lineage_doc, nodes_levels = [], nodes_levels_values = []){
//     `This function is used in the replaceNodes function.
    
//     It creates a list of lists of nodes for each level which is called nodes_levels. One level is a 
//     vertical set of nodes in a graph on a website.

//     nodes_levels[0] is a node with the final table (at the end, on the right)
//     nodels_levels[1] is the final stored procedure producing the final table
//     nodes_levels[2] is a list of nodes with tables which are input for the final procedure
//     and so on`

//     if (nodes_levels.length == 0){
//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.length == 0){
//                 nodes_levels = [[node]]
//                 nodes_levels_values = [[node.value]]
//             }
//         }
//         createNodesLevels(data_lineage_doc, nodes_levels, nodes_levels_values)
//     }
//     else {
//         const new_level = []
//         nodes_levels_values.push([])
//         for (let node of data_lineage_doc.nodes){
//             if (node.linkedTo.filter((x) => nodes_levels_values.slice(-2)[0].includes(x)).length > 0){
//                 new_level.push(node)
//                 nodes_levels_values.slice(-1)[0].push(node.value)
//             }
//         }

//         if (new_level.length > 0) {
//             nodes_levels.push(new_level)
//             createNodesLevels(data_lineage_doc, nodes_levels, nodes_levels_values)
//         } 
//     }

//     return nodes_levels
// }

function createNodes(
    data_lineage_doc, 
    procedures_in_out, 
    table,
    procedure = undefined
){
    `This function creates nodes in the data_lineage_doc object (from the models/dataLineageDocs model)
    for stored procedures and source tables which are used to create the table indicated by the 'table' argument.
    
    procedure argument indicates a name of a procedure for which a given table in an input
    
    procedures_in_out argument is an output from the proceduresInOut function`

    if (procedure == undefined){
        data_lineage_doc.nodes.push({
            value: table,
            type: 'table',
            linkedTo: []
        })
    }

    let procedure_name
    for (let row of procedures_in_out){
        if (row[2] == table){
            procedure_name = row[1]
            data_lineage_doc.nodes.push({
                value: procedure_name,
                type: 'procedure',
                linkedTo: [table]
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

    for (let [i, input_table] of input_tables.entries()){
        data_lineage_doc.nodes.push({
            value: input_table,
            type: 'table',
            linkedTo: [procedure_name]
        })
    }

    for (let [i, input_table] of input_tables.entries()){
        createNodes(
            data_lineage_doc, 
            procedures_in_out, 
            input_table,
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
