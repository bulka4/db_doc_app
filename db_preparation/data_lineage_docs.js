const sql_connector = require('./sql_connector')

getProceduresOutputs()

async function getProceduresOutputs(){
    const [tables, views, procedures] = await getDbData()
    const procedures_outputs = []
    const input_tables = []

    for (let [procedure, script] of procedures){
        if (script == undefined) continue
        if (!script.includes('into') | !script.includes('from')) continue

        const output_table = script.split('into ')[1].split(' ')[0]

        if (!tables.includes(output_table) & !views.includes(output_table)) continue

        console.log(output_table)

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
            procedures_outputs.push([input_table, procedure, output_table])
        }
    }

    console.log(input_tables)
    console.log(procedures_outputs)
}

async function getDbData(){
    let sql = new sql_connector('DNAPROD', 'Stage')
    await sql.createPool()
    const databases = await sql.read_query("SELECT name FROM sys.databases")

    let tables = []
    let views = []
    let procedures = []

    let tables_new
    let views_new
    let procedures_new

    for (let db of databases.recordset){
        // if (db.name != 'Stage') continue

        tables_new = await sql.read_query(`use ${db.name} SELECT (SCHEMA_NAME(schema_id) + '.' + name) as tableName FROM sys.tables`)
        tables_new.recordset.forEach((record, i) => {tables_new.recordset[i] = db.name + '.' + record.tableName.toLowerCase()})

        views_new = await sql.read_query(`use ${db.name} SELECT (schema_name(schema_id) + '.' + name) as viewName FROM sys.views`)
        views_new.recordset.forEach((record, i) => {views_new.recordset[i] = db.name + '.' + record.viewName.toLowerCase()})

        procedures_new = await sql.read_query(`
            use ${db.name}
            SELECT 
                (specific_catalog + '.' + specific_schema + '.' + specific_name) as 'procedureName'
            FROM 
                ${db.name}.INFORMATION_SCHEMA.ROUTINES
            WHERE 
                ROUTINE_TYPE = 'PROCEDURE'
        `)
        procedures_new.recordset.forEach((record, i) => {procedures_new.recordset[i] = record.procedureName.toLowerCase()})

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
