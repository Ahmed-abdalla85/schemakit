/**
 * Legacy DrizzleAdapter (kept as _old)
 */
import { 
  DatabaseAdapter, 
  DatabaseAdapterConfig, 
  ColumnDefinition, 
  TransactionCallback, 
  QueryFilter, 
  QueryOptions 
} from '../adapter';
import { DatabaseError } from '../../errors';

interface DrizzleDatabase {
  execute(query: any): Promise<any>;
  transaction<T>(callback: (tx: DrizzleDatabase) => Promise<T>): Promise<T>;
  select?: any;
  insert?: any;
  update?: any;
  delete?: any;
}

interface SqlOperator {
  raw(sql: string): any;
  fromList(chunks: any[]): any;
  placeholder(name: string): any;
}

interface DatabaseClient {
  connect?(): Promise<void>;
  end?(): Promise<void>;
  close?(): void;
  pragma?(pragma: string): any;
}

interface DrizzleSchemaIntrospection {
  introspectPostgres?(database: any): Promise<any>;
  introspectMySQL?(database: any): Promise<any>;
  introspectSQLite?(database: any): Promise<any>;
}

export class DrizzleAdapter_old extends DatabaseAdapter {
  private db: DrizzleDatabase | null = null;
  private client: DatabaseClient | null = null;
  private connected = false;
  private dbType: 'postgres' | 'sqlite' | 'mysql';
  private sql: SqlOperator | null = null;

  constructor(config: DatabaseAdapterConfig) {
    super(config);
    this.dbType = config.type || 'sqlite';
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      try {
        // @ts-ignore - Optional peer dependency
        const drizzleCore = await import('drizzle-orm');
        this.sql = drizzleCore.sql;
      } catch (error) {
        throw new Error(
          'drizzle-orm is not installed. Please install it as a peer dependency: npm install drizzle-orm'
        );
      }

      switch (this.dbType) {
        case 'postgres':
          await this.connectPostgres();
          break;
        case 'mysql':
          await this.connectMySQL();
          break;
        case 'sqlite':
        default:
          await this.connectSQLite();
          break;
      }
      this.connected = true;
    } catch (error) {
      throw new DatabaseError('connect', { cause: error });
    }
  }

  private async connectPostgres(): Promise<void> {
    let Client: any;
    let drizzle: any;
    
    try {
      // @ts-ignore - Optional peer dependency
      const pgModule = await import('pg');
      Client = pgModule.Client;
    } catch (error) {
      throw new Error(
        'pg is not installed. Please install it as a peer dependency: npm install pg'
      );
    }
    
    try {
      // @ts-ignore - Optional peer dependency
      const drizzleModule = await import('drizzle-orm/node-postgres');
      drizzle = drizzleModule.drizzle;
    } catch (error) {
      throw new Error(
        'drizzle-orm is not installed. Please install it as a peer dependency: npm install drizzle-orm'
      );
    }
    
    this.client = new Client({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      database: this.config.database || 'postgres',
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    
    await this.client?.connect?.();
    this.db = drizzle(this.client!) as DrizzleDatabase;
  }

  private async connectMySQL(): Promise<void> {
    let mysql: any;
    let drizzle: any;
    
    try {
      // @ts-ignore - Optional peer dependency
      mysql = await import('mysql2/promise');
    } catch (error) {
      throw new Error(
        'mysql2 is not installed. Please install it as a peer dependency: npm install mysql2'
      );
    }
    
    try {
      // @ts-ignore - Optional peer dependency
      const drizzleModule = await import('drizzle-orm/mysql2');
      drizzle = drizzleModule.drizzle;
    } catch (error) {
      throw new Error(
        'drizzle-orm is not installed. Please install it as a peer dependency: npm install drizzle-orm'
      );
    }
    
    this.client = await mysql.createConnection({
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
    
    this.db = drizzle(this.client) as DrizzleDatabase;
  }

  private async connectSQLite(): Promise<void> {
    let Database: any;
    let drizzle: any;
    
    try {
      // @ts-ignore - Optional peer dependency
      const sqliteModule = await import('better-sqlite3');
      Database = sqliteModule.default;
    } catch (error) {
      throw new Error(
        'better-sqlite3 is not installed. Please install it as a peer dependency: npm install better-sqlite3'
      );
    }
    
    try {
      // @ts-ignore - Optional peer dependency
      const drizzleModule = await import('drizzle-orm/better-sqlite3');
      drizzle = drizzleModule.drizzle;
    } catch (error) {
      throw new Error(
        'drizzle-orm is not installed. Please install it as a peer dependency: npm install drizzle-orm'
      );
    }
    
    const filename = this.config.filename || ':memory:';
    this.client = new Database(filename);
    
    this.client?.pragma?.('foreign_keys = ON');
    if (filename !== ':memory:') {
      this.client?.pragma?.('journal_mode = WAL');
    }
    
    this.db = drizzle(this.client) as DrizzleDatabase;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      if (this.dbType === 'postgres' && this.client?.end) {
        await this.client.end();
      } else if (this.dbType === 'mysql' && this.client?.end) {
        await this.client.end();
      } else if (this.dbType === 'sqlite' && this.client?.close) {
        this.client.close();
      }
      
      this.db = null;
      this.client = null;
      this.connected = false;
    } catch (error) {
      throw new DatabaseError('disconnect', { cause: error });
    }
  }

  isConnected(): boolean {
    return this.connected && this.db !== null;
  }

  async query<T = any>(sqlQuery: string, params: any[] = []): Promise<T[]> {
    await this.ensureConnected();

    try {
      const query = this.createQuery(sqlQuery, params);
      const result = await this.db!.execute(query);
      return Array.isArray(result) ? result : (result.rows || []);
    } catch (error) {
      throw new DatabaseError('query', { 
        cause: error, 
        context: { 
          operation: 'query',
          database: this.dbType,
          sql: sqlQuery, 
          params 
        } 
      });
    }
  }

  async execute(sqlQuery: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: string | number }> {
    await this.ensureConnected();

    try {
      const query = this.createQuery(sqlQuery, params);
      const result = await this.db!.execute(query);
      
      return this.extractExecutionMetadata(result);
    } catch (error) {
      throw new DatabaseError('execute', { 
        cause: error, 
        context: { 
          operation: 'execute',
          database: this.dbType,
          sql: sqlQuery, 
          params 
        } 
      });
    }
  }

  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    await this.ensureConnected();

    try {
      return await this.db!.transaction(async (tx: DrizzleDatabase) => {
        const txAdapter = new DrizzleAdapter_old(this.config);
        txAdapter.db = tx as any;
        txAdapter.sql = this.sql;
        txAdapter.connected = true as any;
        txAdapter.dbType = this.dbType as any;
        
        return await callback(txAdapter);
      });
    } catch (error) {
      throw new DatabaseError('transaction', { 
        cause: error,
        context: { 
          operation: 'transaction',
          database: this.dbType 
        }
      });
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    await this.ensureConnected();

    try {
      const schema = await this.getSchemaInfo();
      return schema.tables.some((table: any) => 
        table.name === tableName || table.tableName === tableName
      );
    } catch {
      return await this.tableExistsFallback(tableName);
    }
  }

  private async tableExistsFallback(tableName: string): Promise<boolean> {
    const queries = {
      sqlite: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      postgres: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
      mysql: `SELECT EXISTS (SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?) as \`exists\``
    } as const;
    
    const result = await this.query<any>(queries[this.dbType], [tableName]);
    return this.dbType === 'sqlite' ? result.length > 0 : Boolean(result[0]?.exists);
  }

  async createTable(tableName: string, columns: ColumnDefinition[]): Promise<void> {
    const columnDefs = columns.map(col => {
      let def = `${col.name} ${this.mapDataType(col.type)}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.notNull) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.default !== undefined) def += ` DEFAULT ${this.formatDefault(col.default)}`;
      if (col.references) {
        def += ` REFERENCES ${col.references.table}(${col.references.column})`;
        if (col.references.onDelete) def += ` ON DELETE ${col.references.onDelete}`;
      }
      return def;
    }).join(', ');
    
    await this.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`);
  }

  async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    await this.ensureConnected();

    try {
      const schema = await this.getSchemaInfo();
      const table = schema.tables.find((t: any) => 
        t.name === tableName || t.tableName === tableName
      );
      
      if (table?.columns) {
        return this.mapDrizzleColumns(table.columns);
      }
    } catch (error) {
      console.warn('Schema introspection failed, using fallback:', error);
    }

    return await this.getTableColumnsFallback(tableName);
  }

  private async getTableColumnsFallback(tableName: string): Promise<ColumnDefinition[]> {
    if (this.dbType === 'sqlite') {
      const result = await this.query(`PRAGMA table_info(${tableName})`);
      return result.map((row: any) => ({
        name: row.name,
        type: row.type,
        notNull: Boolean(row.notnull),
        default: row.dflt_value,
        primaryKey: Boolean(row.pk)
      }));
    }
    
    const queries = {
      postgres: `SELECT column_name as name, data_type as type, is_nullable = 'NO' as "notNull", column_default as "default"
                 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      mysql: `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notNull, COLUMN_DEFAULT as \`default\`
              FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION`
    } as const;
    
    return await this.query(queries[this.dbType], [tableName]);
  }

  private mapDrizzleColumns(drizzleColumns: any[]): ColumnDefinition[] {
    return drizzleColumns.map(col => ({
      name: col.name,
      type: col.type || col.dataType || 'text',
      notNull: col.notNull || col.isNotNull || false,
      default: col.default || col.defaultValue,
      primaryKey: col.primaryKey || col.isPrimaryKey || false,
      unique: col.unique || col.isUnique || false,
      references: col.references ? {
        table: col.references.table || col.references.tableName,
        column: col.references.column || col.references.columnName,
        onDelete: col.references.onDelete
      } : undefined
    }));
  }

  async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    filters.forEach(filter => {
      const op = this.getOperator(filter.operator || 'eq');
      conditions.push(`${filter.field} ${op} ${this.placeholder(params.length)}`);
      params.push(filter.value);
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    if (options.orderBy?.length) {
      query += ` ORDER BY ${options.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`;
    }
    
    if (options.limit) query += ` LIMIT ${options.limit}`;
    if (options.offset) query += ` OFFSET ${options.offset}`;
    
    return await this.query(query, params);
  }
  
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => this.placeholder(i)).join(', ');
    
    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const returning = this.dbType === 'postgres' ? ' RETURNING *' : '';
    
    const result = await this.execute(query + returning, values);
    
    return this.dbType === 'postgres' && result.lastInsertId
      ? result.lastInsertId
      : { ...data, id: result.lastInsertId || data.id };
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const sets = fields.map((f, i) => `${f} = ${this.placeholder(i)}`).join(', ');
    
    values.push(id);
    const where = `id = ${this.placeholder(values.length - 1)}`;
    
    const result = await this.execute(`UPDATE ${table} SET ${sets} WHERE ${where}`, values);
    if (result.changes === 0) throw new Error(`No record found with id: ${id}`);
    
    return { id, ...data };
  }

  async delete(table: string, id: string): Promise<void> {
    const values = [id];
    const where = `id = ${this.placeholder(0)}`;
    
    const result = await this.execute(`DELETE FROM ${table} WHERE ${where}`, values);
    if (result.changes === 0) throw new Error(`No record found with id: ${id}`);
  }

  async count(table: string, filters: QueryFilter[]): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];
    
    filters.forEach(filter => {
      const op = this.getOperator(filter.operator || 'eq');
      conditions.push(`${filter.field} ${op} ${this.placeholder(params.length)}`);
      params.push(filter.value);
    });
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await this.query<{ count: number }>(query, params);
    return Number(result[0]?.count) || 0;
  }

  async findById(table: string, id: string): Promise<any | null> {
    const values = [id];
    const where = `id = ${this.placeholder(0)}`;
    
    const result = await this.query(`SELECT * FROM ${table} WHERE ${where} LIMIT 1`, values);
    return result[0] || null;
  }

  async createSchema(schemaName: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    } else if (this.dbType === 'mysql') {
      await this.execute(`CREATE DATABASE IF NOT EXISTS ${schemaName}`);
    }
  }

  async dropSchema(schemaName: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.execute(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    } else if (this.dbType === 'mysql') {
      await this.execute(`DROP DATABASE IF EXISTS ${schemaName}`);
    }
  }

  async listSchemas(): Promise<string[]> {
    if (this.dbType === 'sqlite') return ['main'];
    
    const query = this.dbType === 'postgres'
      ? `SELECT schema_name FROM information_schema.schemata 
         WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`
      : `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA 
         WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')`;
    
    const result = await this.query(query);
    return result.map(row => row.schema_name || row.SCHEMA_NAME);
  }

  private placeholder(index: number): string {
    return this.dbType === 'postgres' ? `$${index + 1}` : '?';
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  private async getSchemaInfo(): Promise<{ tables: any[] }> {
    try {
      const introspect = await this.getDrizzleIntrospection();
      
      if (introspect) {
        let schema;
        if (this.dbType === 'postgres' && introspect.introspectPostgres && this.db) {
          schema = await introspect.introspectPostgres(this.db);
        } else if (this.dbType === 'mysql' && introspect.introspectMySQL && this.db) {
          schema = await introspect.introspectMySQL(this.db);
        } else if (this.dbType === 'sqlite' && introspect.introspectSQLite && this.db) {
          schema = await introspect.introspectSQLite(this.db);
        }
        
        if (schema) {
          return { tables: schema.tables || [] };
        }
      }
    } catch (error) {
      console.warn('Drizzle introspection not available, using fallback');
    }
    
    return { tables: [] };
  }

  private async getDrizzleIntrospection(): Promise<DrizzleSchemaIntrospection | null> {
    return null;
  }

  private createQuery(sqlQuery: string, params: any[]): any {
    if (params.length === 0) {
      return this.sql!.raw(sqlQuery);
    }
    const chunks: any[] = [];
    const placeholder = this.dbType === 'postgres' ? /\$\d+/ : /\?/;
    const parts = sqlQuery.split(placeholder);
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) chunks.push(this.sql!.raw(parts[i]));
      if (i < parts.length - 1 && i < params.length) {
        chunks.push(params[i]);
      }
    }
    
    return this.sql!.fromList(chunks);
  }

  private extractExecutionMetadata(result: any): { changes: number; lastInsertId?: string | number } {
    if (this.dbType === 'postgres') {
      return { 
        changes: result.rowCount || 0,
        lastInsertId: result.rows?.[0]?.id 
      };
    } else if (this.dbType === 'mysql') {
      return { 
        changes: result.affectedRows || 0,
        lastInsertId: result.insertId 
      };
    } else {
      return { 
        changes: result.changes || 0,
        lastInsertId: result.lastInsertRowid 
      };
    }
  }

  private getOperator(op: string): string {
    const operators: Record<string, string> = {
      eq: '=', neq: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=',
      like: 'LIKE', in: 'IN', nin: 'NOT IN'
    };
    return operators[op] || '=';
  }

  private mapDataType(type: string): string {
    const typeMap: Record<string, Record<string, string>> = {
      postgres: {
        string: 'VARCHAR(255)', text: 'TEXT', integer: 'INTEGER',
        boolean: 'BOOLEAN', date: 'DATE', datetime: 'TIMESTAMP',
        json: 'JSONB', uuid: 'UUID'
      },
      mysql: {
        string: 'VARCHAR(255)', text: 'TEXT', integer: 'INT',
        boolean: 'BOOLEAN', date: 'DATE', datetime: 'DATETIME',
        json: 'JSON', uuid: 'VARCHAR(36)'
      },
      sqlite: {
        string: 'TEXT', text: 'TEXT', integer: 'INTEGER',
        boolean: 'INTEGER', date: 'TEXT', datetime: 'TEXT',
        json: 'TEXT', uuid: 'TEXT'
      }
    };
    return typeMap[this.dbType]?.[type.toLowerCase()] || type.toUpperCase();
  }

  private formatDefault(value: any): string {
    if (value === null) return 'NULL';
    if (value === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return this.dbType === 'sqlite' ? (value ? '1' : '0') : String(value);
    return String(value);
  }

  get drizzleInstance(): DrizzleDatabase {
    console.warn('Direct Drizzle access bypasses SchemaKit features (permissions, RLS, workflows). Use with caution.');
    return this.db!;
  }
}


