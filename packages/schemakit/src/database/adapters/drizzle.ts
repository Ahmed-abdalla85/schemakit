/**
 * DrizzleAdapter - Database adapter using Drizzle ORM
 * 
 * This adapter leverages Drizzle ORM's query builder for better performance
 * and type safety while maintaining the DatabaseAdapter interface.
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

// Type-only imports for optional peer dependencies
type SqlOperator = { raw: (sql: string, params?: any[]) => any };
type DrizzleDatabase = any; // Will be properly typed when Drizzle is installed

/**
 * DrizzleAdapter implementation
 * 
 * Uses Drizzle ORM for all database operations, providing connection pooling,
 * prepared statements, and query optimization out of the box.
 * 
 * Note: Requires the following peer dependencies to be installed:
 * - drizzle-orm
 * - For PostgreSQL: pg
 * - For MySQL: mysql2  
 * - For SQLite: better-sqlite3
 */
export class DrizzleAdapter extends DatabaseAdapter {
  private db: DrizzleDatabase | null = null;
  private client: any = null;
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
      // Import sql operator from drizzle-orm
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
    
    await this.client.connect();
    this.db = drizzle(this.client) as DrizzleDatabase;
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
    
    // Enable foreign keys and WAL mode for SQLite
    this.client.pragma('foreign_keys = ON');
    if (filename !== ':memory:') {
      this.client.pragma('journal_mode = WAL');
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

  async query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected()) await this.connect();

    try {
      // Use Drizzle's sql operator for safe parameterized queries
      const preparedQuery = params?.length 
        ? this.sql!.raw(sqlQuery, params)
        : this.sql!.raw(sqlQuery);
      
      const result = await this.db!.execute(preparedQuery);
      return Array.isArray(result) ? result : (result.rows || []);
    } catch (error) {
      throw new DatabaseError('query', { cause: error, context: { sql: sqlQuery, params } });
    }
  }

  async execute(sqlQuery: string, params?: any[]): Promise<{ changes: number; lastInsertId?: string | number }> {
    if (!this.isConnected()) await this.connect();

    try {
      const preparedQuery = params?.length 
        ? this.sql!.raw(sqlQuery, params)
        : this.sql!.raw(sqlQuery);
      
      const result = await this.db!.execute(preparedQuery);
      
      // Extract metadata based on database type
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
    } catch (error) {
      throw new DatabaseError('execute', { cause: error, context: { sql: sqlQuery, params } });
    }
  }

  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    if (!this.isConnected()) await this.connect();

    try {
      return await (this.db as any).transaction(async (tx: any) => {
        const txAdapter = Object.create(this);
        txAdapter.db = tx;
        return await callback(txAdapter);
      });
    } catch (error) {
      throw new DatabaseError('transaction', { cause: error });
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    const query = this.dbType === 'sqlite'
      ? `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      : this.dbType === 'postgres'
      ? `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`
      : `SELECT EXISTS (SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?) as \`exists\``;
    
    const result = await this.query<any>(query, [tableName]);
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
    
    const query = this.dbType === 'postgres'
      ? `SELECT column_name as name, data_type as type, is_nullable = 'NO' as "notNull", column_default as "default"
         FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`
      : `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notNull, COLUMN_DEFAULT as \`default\`
         FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION`;
    
    return await this.query(query, [tableName]);
  }

  // Dynamic query methods for SchemaKit's runtime schema
  async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];
    
    // Build filter conditions
    filters.forEach(filter => {
      const op = this.getOperator(filter.operator || 'eq');
      conditions.push(`${filter.field} ${op} ${this.placeholder(params.length)}`);
      params.push(filter.value);
    });
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add ordering
    if (options.orderBy?.length) {
      query += ` ORDER BY ${options.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`;
    }
    
    // Add pagination
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

  // Schema management for multi-tenancy
  async createSchema(schemaName: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    } else if (this.dbType === 'mysql') {
      await this.execute(`CREATE DATABASE IF NOT EXISTS ${schemaName}`);
    }
    // SQLite doesn't support schemas
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

  // Helper methods
  private placeholder(index: number): string {
    return this.dbType === 'postgres' ? `$${index + 1}` : '?';
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

  /**
   * Get the underlying Drizzle instance (escape hatch)
   * @warning This bypasses SchemaKit features like permissions and RLS.
   */
  get drizzleInstance(): DrizzleDatabase {
    console.warn('Direct Drizzle access bypasses SchemaKit features (permissions, RLS, workflows). Use with caution.');
    return this.db!;
  }
}