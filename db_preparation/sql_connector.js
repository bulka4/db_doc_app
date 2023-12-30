const sql = require('mssql/msnodesqlv8')

class sql_connector {
    constructor(server, database){
        this.config = {
            database: database,
            server: server,
            driver: 'msnodesqlv8',
            options: {
                trustedConnection: true
            }
        }
    }

    async createPool(){
        this.pool = await sql.connect(this.config)
    }

    async read_query(query){
        const result = await this.pool.request().query(query)
        return result
    }
}

module.exports = sql_connector