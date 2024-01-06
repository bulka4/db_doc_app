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
        ['table_14', 'proc_00', 'table_00'],
        ['table_15', 'proc_00', 'table_00'],
        ['table_16', 'proc_00', 'table_00'],
        ['table_17', 'proc_00', 'table_00'],
        ['table_18', 'proc_00', 'table_00'],
        ['table_19', 'proc_00', 'table_00'],
        
        ['table_20', 'proc_10', 'table_10'],
        ['table_21', 'proc_10', 'table_10'],
        ['table_22', 'proc_10', 'table_10'],
        ['table_23', 'proc_10', 'table_10'],
        // ['table_24', 'proc_10', 'table_10'],
        // ['table_25', 'proc_10', 'table_10'],
        // ['table_26', 'proc_10', 'table_10'],
        // ['table_27', 'proc_10', 'table_10'],

        ['table_28', 'proc_11', 'table_11'],
        ['table_29', 'proc_11', 'table_11'],
        ['table_210', 'proc_11', 'table_11'],
        ['table_211', 'proc_11', 'table_11'],
        
        ['table_30', 'proc_20', 'table_21'],
        ['table_31', 'proc_20', 'table_21'],
        ['table_32', 'proc_20', 'table_21'],
        ['table_33', 'proc_20', 'table_21'],
        ['table_34', 'proc_20', 'table_21'],
        ['table_35', 'proc_20', 'table_21'],

        ['table_36', 'proc_21', 'table_20'],
        ['table_37', 'proc_21', 'table_20'],
        ['table_38', 'proc_21', 'table_20'],
        ['table_39', 'proc_21', 'table_20']

        // ['table_17', 'proc_01', 'table_01'],
        // ['table_18', 'proc_01', 'table_01'],
        // ['table_19', 'proc_01', 'table_01'],

        // ['table_28', 'proc_12', 'table_17'],
        // ['table_29', 'proc_12', 'table_17'],

        // ['table_210', 'proc_13', 'table_18']
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

    // for (let final_table of final_tables){
    //     createDataLineageDocs(final_table, final_table, procedures_in_out)
    // }
    createDataLineageDocs(final_tables[0], final_tables[0], procedures_in_out)

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

function replaceNodes(
    data_lineage_doc, 
    min_x_coordinate = -470, 
    min_y_coordinate = -270, 
    nodes_levels = [],
    max_no_nodes = undefined,
    output_tables_names = undefined,
    output_tables_y_coordinates = undefined,
    level_number = undefined
    ){
    // check if this is the first iteration
    if (nodes_levels.length == 0){
        [nodes_levels, max_no_nodes] = createNodesLevels(data_lineage_doc)

        replaceInputTablesLevel(
            nodes_levels, 
            0,
            min_y_coordinate, 
            min_x_coordinate,
            max_no_nodes,
            fixed_tables_names = [],
            fixed_tables_y_coordinates = []
        )

        const result = replaceScriptsAndOutputTables(
            data_lineage_doc,
            nodes_levels,
            level_number = 1,
            min_x_coordinate
        )
        // list with names of the output tables. We need this so in the next iteration we know that
        // positions of those nodes should not be changed
        output_tables_names = result[0]
        output_tables_y_coordinates = result[1]

        replaceNodes(
            data_lineage_doc, 
            min_x_coordinate, 
            min_y_coordinate, 
            nodes_levels,
            max_no_nodes,
            output_tables_names,
            output_tables_y_coordinates,
            level_number = 2
        )
    } else {
        // check if this is the end of iterations
        if (level_number == nodes_levels.length - 1) return

        // replace nodes with input tables
        replaceInputTablesLevel(
            nodes_levels, 
            level_number,
            min_y_coordinate, 
            min_x_coordinate,
            max_no_nodes,
            fixed_tables_names = output_tables_names,
            fixed_tables_y_coordinates = output_tables_y_coordinates
        )

        // replace level with scripts and tables created by those scripts
        const result = replaceScriptsAndOutputTables(
            data_lineage_doc,
            nodes_levels,
            level_number + 1,
            min_x_coordinate
        )
        output_tables_names = result[0]
        output_tables_y_coordinates = result[1]
        
        replaceNodes(
            data_lineage_doc, 
            min_x_coordinate, 
            min_y_coordinate, 
            nodes_levels,
            max_no_nodes,
            output_tables_names,
            output_tables_y_coordinates,
            level_number = level_number + 2
        )
    }
}

function replaceScriptsAndOutputTables(
    data_lineage_doc,
    nodes_levels,
    level_number,
    min_x_coordinate
){
    `This function is used in the replaceNodes function`
    const scripts_level = nodes_levels[level_number]

    const output_tables_names = []
    const output_tables_y_coordinates = []

    for (let [i, script_node] of scripts_level.entries()){
        let input_tables = nodes_levels[level_number - 1][i]
        let min_input_tables_y = Infinity
        let output_table = findOutputNode(script_node, data_lineage_doc)

        for (let table_node of input_tables){
            if (table_node.y < min_input_tables_y) min_input_tables_y = table_node.y
        }

        script_node.x = min_x_coordinate + (level_number) * 150
        script_node.y = min_input_tables_y + (input_tables.length - 1) / 2 * 40

        output_table.x = min_x_coordinate + (level_number + 1) * 150
        output_table.y = min_input_tables_y + (input_tables.length - 1) / 2 * 40

        output_tables_names.push(output_table.value)
        output_tables_y_coordinates.push(output_table.y)
    }

    return [output_tables_names, output_tables_y_coordinates]
}

function replaceInputTablesLevel(
    nodes_levels, 
    level_number,
    min_y_coordinate, 
    min_x_coordinate,
    max_no_nodes,
    fixed_tables_names = [],
    fixed_tables_y_coordinates = []
    ){
    `This is a function used in the replaceNodes function`
    
    // level with table nodes which we will be replacing now
    const input_tables_level = nodes_levels[level_number]

    let min_input_tables_y_coordinate = -270
    for (let input_tables_list of input_tables_level){
        // table nodes which are outputs of scripts. Their positions can't be changed
        let fixed_input_tables = input_tables_list.filter(node => {fixed_tables_names.includes(node.value)})

        if (fixed_input_tables.length >= 2){
            let fixed_input_tables_y_min = Infinity
            let fixed_input_tables_y_max = -Infinity
            
            fixed_input_tables.forEach(node => {
                if (node.y > fixed_input_tables_y_max) fixed_input_tables_y_max = node.y
                if (node.y < fixed_input_tables_y_min) fixed_input_tables_y_min = node.y
            })

            // height of a set of input table nodes
            const height = Math.max(
                (fixed_input_tables_y_max - fixed_input_tables_y_min),
                input_tables_list.length * 40
            )
            min_input_tables_y_coordinate = fixed_input_tables_y_min + ((fixed_input_tables_y_max - fixed_input_tables_y_min) - height) / 2

            for (let [i, table_node] of input_tables_list.entries()){
                if (fixed_tables_names.includes(table_node.value)) continue

                table_node.x = min_x_coordinate + 150 * level_number
                table_node.y = min_input_tables_y_coordinate + i * 40

                for (let y of fixed_tables_y_coordinates){
                    if (Math.abs(y - table_node.y) < 40) table_node.y = y + 40
                }
            }
        // else if (fixed_input_tables.length == 2){}
        } else {
            for (let [i, table_node] of input_tables_list.entries()){
                if (fixed_tables_names.includes(table_node.value)) continue
                
                table_node.x = min_x_coordinate + 150 * level_number
                table_node.y = min_input_tables_y_coordinate + i * 40

                for (let y of fixed_tables_y_coordinates){
                    if (Math.abs(y - table_node.y) < 40) table_node.y = y + 40
                }
            }
        }

        min_input_tables_y_coordinate += input_tables_list.length * 40
    }


    // // minimal y coordinate of table nodes for a given level
    // const min_table_nodes_y = min_y_coordinate + (max_no_nodes - input_tables_level.flat().length) / 2 * 40

    // let previous_table_node_y = min_table_nodes_y - 40
    // for (let [i, table_node] of input_tables_level.flat().entries()){
    //     // we don't want to change positions of table nodes which are an output of scripts
    //     if (fixed_tables_names.includes(table_node.value)) continue

    //     table_node.x = min_x_coordinate + 150 * level_number
    //     table_node.y = previous_table_node_y + 40

    //     for (let y of fixed_tables_y_coordinates){
    //         if (Math.abs(y - table_node.y) < 40) table_node.y = y + 40
    //     }

    //     previous_table_node_y = table_node.y
    // }
}

function createNodesLevels(data_lineage_doc, nodes_levels = []){
    `This function is used in the replaceNodes function.
    
    It creates a list of lists of nodes for each level which is called nodes_levels. One level is a 
    vertical set of nodes in a graph on a website.

    nodes_levels[i][0] is a list of tables which are inputs for the nodes_levels[i + 1][0] procedure
    nodes_levels[i][1] is a list of tables which are inputs for the nodes_levels[i + 1][1] procedure
    and so on`

    // at first we create nodes_levels such that nodes_levels[i][0] is a list of tables which are inputs for the 
    // nodes_levels[i - 1][0] procedure and then we will reorder nodes_levels such that 
    // nodes_levels[i][0] is a list of tables which are inputs for the nodes_levels[i + 1][0] procedure
    if (nodes_levels.length == 0){
        for (let node of data_lineage_doc.nodes){
            if (node.linkedTo.length == 0){
                nodes_levels = [[[node]]]
            }
        }
        createNodesLevels(data_lineage_doc, nodes_levels)
    } else {
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

    // change the order of levels in the nodes_levels
    const nodes_levels_reordered = []
    for (let level_nr of Array.from(Array(nodes_levels.length).keys(), x => nodes_levels.length - 1 - x)){
        nodes_levels_reordered.push(nodes_levels[level_nr])
    }

    // check the maximum number of nodes in one level
    max_no_nodes = -Infinity

    for (let [i, level] of nodes_levels.entries()){
        // check if this is a level with tables
        if (i % 2 == 0){
            if (level.flat().length > max_no_nodes) max_no_nodes = level.flat().length
        } else {
            if (level.length > max_no_nodes) max_no_nodes = level.length
        }
    }

    return [nodes_levels_reordered, max_no_nodes]
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

Array.prototype.max = function() {
    return Math.max.apply(null, this);
};

Array.prototype.min = function() {
    return Math.min.apply(null, this);
};