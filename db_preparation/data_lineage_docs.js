const sql_connector = require('./sql_connector')
const Docs = require('../models/dataLineageDocs')

// connecting with mongoose in this file is just for testing. I can remove it later on
const mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1/db_doc')

// height and width of a data lineage graph which is being created in the ./public/dataLineageScripts.js file
// by the createVisualization function
const data_lineage_graph_width = 3000
const data_lieange_graph_height = 2000

test()

async function test2(){
    let data_lineage_doc = await Docs.find({dataLineageName: 'stage.trados.trados_salesforcecontract'})
    data_lineage_doc = data_lineage_doc[0]
    
    nodes_levels = createNodesLevels(data_lineage_doc)
    console.log(nodes_levels)
}

async function test(){
    // scripts_in_out[i][0] is an input table for the i-th stored procedure scripts_in_out[i][1] which
    // creates an output table called scripts_in_out[i][2]

    const scripts_in_out = await scriptsInOut()

    // final tables are tables which are not being an input for any stored procedure
    const final_tables = []
    for (let row of scripts_in_out){
        let table = row[2]
        let isFinalTable = true
        for (let row of scripts_in_out){
            if (row[0] == table) {
                isFinalTable = false
                break
            }
        }

        if (isFinalTable & !final_tables.includes(table)) final_tables.push(table)
    }

    for (let final_table of final_tables){
        let dataLineageId = await Docs.count({}) + 1
        createDataLineageDocs(
            final_table, 
            final_table, 
            scripts_in_out,
            dataLineageId
        )
    }

    console.log('done')
}

async function createDataLineageDocs(
    final_table, 
    data_lineage_name, 
    scripts_in_out,
    dataLineageId
){
    `This function creates a data lineage document which shows how a given table called final_table
    is being created. This document is being saved in the models/dataLineageDocs.js data model and it can be used by 
    routes/data_lineage_route.js and views/dataLineage.ejs files for creating data lineage visualizations`

    const data_lineage_doc = {
        dataLineageId: dataLineageId,
        dataLineageName: data_lineage_name,
        nodes: []
    }

    createNodes(data_lineage_doc, scripts_in_out, final_table)
    // replaceNodes(data_lineage_doc)

    await Docs.insertMany(data_lineage_doc)
}

function replaceNodes(
    data_lineage_doc,
    max_level_width = 600,
    max_x_coordinate = undefined, 
    min_y_coordinate = -data_lieange_graph_height / 2 + 20,
    output_table_node = undefined,
    input_tables_nodes = undefined,
    script_node = undefined,
    nodes_levels = undefined,
    output_table_level_nr = 0
    ){
    `This function works in iterations. In each iteration we are creating one segment. A segment is a set of output table, a script which
    creates that output table and input tables which are an input for that script
    
    max_level_width argument indicates a maximum width of a nodes level. Those are the nodes with the same x coordinate`

    // check if this is the first iteration
    if (output_table_node == undefined){
        nodes_levels = createNodesLevels(data_lineage_doc)

        max_x_coordinate = Math.min(
            data_lineage_graph_width / 2,
            -data_lineage_graph_width / 2 + (nodes_levels.length - 1) * max_level_width
        )

        // initial position of nodes
        for (let [i, level] of nodes_levels.entries()){
            const level_nodes = level.flat()
            const level_nodes_values = []
            
            level_nodes.forEach(node => {
                level_nodes_values.push(node.value)
            })

            // check what is the level width. This is the maximum width of a single node in that level.
            // It depends on a number of characters in this node value
            let level_width = level_nodes_values[0].length * 10
            level_nodes_values.forEach(value => {
                if (value.length * 10 > level_width) level_width = value.length * 10
            })
            level_width += 200

            for (let [j, node] of level_nodes.entries()){
                node.x = max_x_coordinate - i * level_width
                node.y = min_y_coordinate
            }
        }

        output_table_node = nodes_levels[output_table_level_nr][0][0]
        input_tables_nodes = nodes_levels[output_table_level_nr + 2][0]
        script_node = nodes_levels[output_table_level_nr + 1][0]
    }

    // check if this is the end of iterations
    if (output_table_level_nr == nodes_levels.length - 1) return

    // replace input tables nodes which are being created by some script
    for (let [i, input_table_node] of input_tables_nodes.entries()){
        let source_script = findInputNodes(input_table_node, data_lineage_doc)[0]

        if (source_script == undefined) continue

        // check what is the minimal y coordinate for input tables for the next segment (next iteration)
        let new_min_y_coordinate = -Infinity
        nodes_levels[output_table_level_nr + 4].flat().forEach(node => {
            if (node.y > new_min_y_coordinate) new_min_y_coordinate = node.y + 40
        })
        // input tables for the next segment (next iteration)
        let new_input_tables_nodes = findInputNodes(source_script, data_lineage_doc)

        replaceNodes(
            data_lineage_doc,
            max_level_width,
            max_x_coordinate - max_level_width * 2, 
            new_min_y_coordinate,
            input_table_node,
            new_input_tables_nodes,
            source_script,
            nodes_levels,
            output_table_level_nr + 2
        )
    }

    // replace input tables nodes which are not being created by any script
    for (let [i, input_table_node] of input_tables_nodes.entries()){
        let source_script = findInputNodes(input_table_node, data_lineage_doc)[0]
        if (source_script != undefined) continue

        input_table_node.y = min_y_coordinate

        // check if the node is not to close to other nodes in the same level. If yes then move it
        let closest_node = findClosestNode(input_table_node, data_lineage_doc)

        if (closest_node == undefined) continue
        while (Math.abs(closest_node.y - input_table_node.y) < 40){
            input_table_node.y = closest_node.y + 40
            closest_node = findClosestNode(input_table_node, data_lineage_doc)
        }
    }

    // replace the script node
    script_node.y = min_y_coordinate + (input_tables_nodes.length - 1) / 2 * 40

    // replace the output table node
    output_table_node.y = script_node.y
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
    } else {
        // check if now is a level with tables
        if (nodes_levels.length % 2 == 0){
            let previous_level_procedures = nodes_levels.slice(-1)[0]
            const new_level = []

            for (let procedure of previous_level_procedures){
                let linked_nodes = findInputNodes(procedure, data_lineage_doc)
                // new_level.push(linked_nodes)

                // push only those nodes which are tables, not scripts (views tables and scripts has the same name)
                new_level.push(linked_nodes.filter(x => x.type == 'table'))
            }

            nodes_levels.push(new_level)
            createNodesLevels(data_lineage_doc, nodes_levels)
        } else {
            //  this is a level with procedures
            const new_level = []
            for (let table_node of nodes_levels.slice(-1)[0].flat()){
                let linked_nodes = findInputNodes(table_node, data_lineage_doc)
                if (linked_nodes.length > 0) {
                    // new_level.push(linked_nodes[0])

                    // push only those nodes which are tables, not scripts (views tables and scripts has the same name)
                    new_level.push(linked_nodes.filter(x => x.type == 'script')[0])
                }
            }

            if (new_level.length > 0){
                nodes_levels.push(new_level)
                createNodesLevels(data_lineage_doc, nodes_levels)
            }
        }
    }

    return nodes_levels
}

function findClosestNode(node, data_lineage_doc){
    `This function finds the closest node in the same level (level contains nodes with the same x coordinate)`

    let closest_node
    for (let node2 of data_lineage_doc.nodes){
        if (
            closest_node == undefined 
            & node2.value != node.value
            & node2.x == node.x
        ){
            closest_node = node2
            break
        }
    }

    if (closest_node == undefined) return closest_node

    for (let node2 of data_lineage_doc.nodes){
        if (
            node2.value != node.value 
            & Math.abs(node2.y - node.y) < Math.abs(closest_node.y - node.y)
            & node2.x == node.x
        ) 
            closest_node = node2
    }

    return closest_node
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
        // we need to make sure that nodes types are different because view scripts and tables nodes have the same value
        if (node2.linkedTo.includes(node.value) & node2.type != node.type) linked_nodes.push(node2)
    }

    return linked_nodes
}

function createNodes(
    data_lineage_doc, 
    scripts_in_out, 
    table,
    first_iteration = true
){
    `This function creates nodes in the data_lineage_doc object (from the models/dataLineageDocs model)
    for stored procedures and source tables which are used to create the table indicated by the 'table' argument.
    
    procedure argument indicates a name of a procedure for which a given table in an input
    
    scripts_in_out argument is an output from the scriptsInOut function`

    if (first_iteration){
        data_lineage_doc.nodes.push({
            value: table,
            type: 'table',
            linkedTo: []
        })
    }

    let script_name
    for (let row of scripts_in_out){
        if (row[2] == table){
            script_name = row[1]
            data_lineage_doc.nodes.push({
                value: script_name,
                type: 'script',
                linkedTo: [table]
            })
            break
        }
    }

    if (script_name == undefined) return

    let input_tables = []
    scripts_in_out.forEach((x) => {
        if (x[1] == script_name & !input_tables.includes(x[0]))
            input_tables.push(x[0])
    })

    for (let [i, input_table] of input_tables.entries()){
        data_lineage_doc.nodes.push({
            value: input_table,
            type: 'table',
            linkedTo: [script_name]
        })
    }

    for (let input_table of input_tables){
        createNodes(
            data_lineage_doc, 
            scripts_in_out, 
            input_table,
            first_iteration = false
        )
    }
}

async function scriptsInOut(){
    `This function creates a variable called scripts_in_out such that scripts_in_out[i][0] is an input table for the 
    i-th procedure called scripts_in_out[i][1] which inserts data into the scripts_in_out[i][2] output table`

    const [tables, views, procedures] = await getDbData()
    const scripts_in_out = []
    const views_names = views.map(x => x[0])

    // insert into the scripts_in_out data about procedures, what tables they take as input and what table they create
    for (let [procedure_name, script] of procedures){
        if (script == undefined) continue
        if (!script.includes('into') | !script.includes('from')) continue

        const input_tables = []
        const output_table = script.split('into ')[1].split(' ')[0]
        const script_words = script.split(' ')
        
        if (!tables.includes(output_table) & !views_names.includes(output_table)) continue

        for(let [i, word] of script_words.entries()){
            if (['from', 'join'].includes(word)){
                if ((tables.includes(script_words[i + 1]) | views_names.includes(script_words[i + 1]))
                    & !input_tables.includes(script_words[i + 1]) 
                ){
                    input_tables.push(script_words[i + 1])
                }
            }
        }

        // if input tables contains output table than we can't create a data lineage graph for that procedure
        if (input_tables.includes(output_table)) continue

        for (let input_table of input_tables){
            scripts_in_out.push([input_table, procedure_name, output_table])
        }
    }

    // insert into the scripts_in_out data about views, what tables they take as input and what table they create
    for (let [view_name, view_script] of views){
        if (view_script == undefined) continue
        
        const input_tables = []
        const script_words = view_script.split(' ')

        for(let [i, word] of script_words.entries()){
            if (['from', 'join'].includes(word)){
                if ((tables.includes(script_words[i + 1]) | views_names.includes(script_words[i + 1]))
                    & !input_tables.includes(script_words[i + 1]) 
                ){
                    input_tables.push(script_words[i + 1])
                }
            }
        }

        for (let input_table of input_tables){
            scripts_in_out.push([input_table, view_name, view_name])
        }
    }

    return scripts_in_out
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
        let views_new = await sql.read_query(
            `use ${db.name} 
            SELECT 
                (schema_name(v.schema_id) + '.' + v.name) as viewName,
                m.definition
            FROM 
                sys.views as v
                join sys.sql_modules as m on m.object_id = v.object_id`
        )
        // let procedures_new = await sql.read_query(
        //     `use ${db.name}
        //     SELECT 
        //         (specific_catalog + '.' + specific_schema + '.' + specific_name) as 'procedureName'
        //     FROM 
        //         ${db.name}.INFORMATION_SCHEMA.ROUTINES
        //     WHERE 
        //         ROUTINE_TYPE = 'PROCEDURE'`
        // )
        let procedures_new = await sql.read_query(
            `use ${db.name}
            SELECT 
                (specific_catalog + '.' + specific_schema + '.' + specific_name) as 'procedureName',
                routine_definition as routineDefinition
            FROM 
                ${db.name}.INFORMATION_SCHEMA.ROUTINES
            WHERE 
                ROUTINE_TYPE = 'PROCEDURE'`
        )

        // change names into a lower case
        tables_new.recordset.forEach((record, i) => {tables_new.recordset[i] = (db.name + '.' + record.tableName).toLowerCase()})
        // views_new.recordset.forEach((record, i) => {views_new.recordset[i] = (db.name + '.' + record.viewName).toLowerCase()})
        views_new.recordset.forEach((record, i) => {
            views_new.recordset[i] = [(db.name + '.' + record.viewName).toLowerCase(), cleanCode(record.definition.toLowerCase())]
        })
        // procedures_new.recordset.forEach((record, i) => {procedures_new.recordset[i] = record.procedureName.toLowerCase()})
        procedures_new.recordset.forEach((record, i) => {
            procedures_new.recordset[i] = [record.procedureName.toLowerCase(), cleanCode(record.routineDefinition)]
        })

        // // get procedures'code
        // procedures_new.recordset = await Promise.all(procedures_new.recordset.map(async (procedure) => {
        //     const procedure_name = procedure.split('.').slice(1).join('.')
        //     let procedure_code = await sql.read_query(`use ${db.name} SELECT OBJECT_DEFINITION (OBJECT_ID(N'${procedure_name}')) as code`)
        //     procedure_code = cleanCode(procedure_code.recordset[0].code)
        //     return [procedure, procedure_code]
        // }))

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