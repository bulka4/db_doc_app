from sqlalchemy import create_engine
import pandas as pd
import sqlalchemy

class sql_connector:
    def __init__(self, server, database):
        self.server = server
        self.database = database
        
        driver = 'SQL Server Native Client 11.0'
        connection_url = f'mssql://@{self.server}/{self.database}?driver={driver}'
        self.engine = create_engine(connection_url, fast_executemany=True)
        self.con = self.engine.connect()
        self.raw_con = self.engine.raw_connection()
        self.cursor = self.raw_con.cursor()
        
    def read_query(self, query):
        "saving result of a sql query in a dataframe"
        
        return pd.read_sql(sql = query, con = self.con)
    
    def read_sql_file(self, file_path):
        "saving a result of a sql query from a file to a dataframe"
        
        with open(file_path, 'r') as query:
            return pd.read_sql(sql = query.read(), con = self.con)
        
    def execute_sql_file(self, file_path):
        "executing sql file"
        
        with open(file_path, 'r') as file:
            self.cursor.execute(file.read())
            self.raw_con.commit()
            
    def execute_query(self, query):
        "executing sql query"
        
        self.cursor.execute(query)
        self.raw_con.commit()
    
    def to_sql(self, 
               dataframe, 
               sql_table_name, 
               sql_schema_name, 
               if_exists
              ):
        """
        Inserting data from a dataframe into a sql database.
        Argument sql_table_name is a name of a SQL table to which we will insert the data.
        Argument sql_schema_name is a name of a SQL schema in thich that table will be placed.
        """
        
        # def get_optimal_chunksize(col_count):
        col_count = len(dataframe.columns)
        max_params = 2000
        chunksize =  max_params // col_count
        
        # if schema doesnt exist then create it
        if sql_schema_name not in self.con.dialect.get_schema_names(self.con):
            self.con.execute(sqlalchemy.schema.CreateSchema(sql_schema_name))
        
        dataframe.to_sql(name = sql_table_name, 
                         schema = sql_schema_name, 
                         con = self.engine, 
                         index = False, 
                         if_exists = if_exists, 
                         chunksize = chunksize, 
                         method = "multi"
                        )