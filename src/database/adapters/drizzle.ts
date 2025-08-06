/**
 * DrizzleAdapter - Database adapter using Drizzle ORM
 * 
 * This adapter uses Drizzle ORM internally to provide database operations
 * for PostgreSQL, SQLite, and MySQL while maintaining the DatabaseAdapter interface.
 * 
 * @internal Drizzle is an implementation detail and should not be exposed
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
import { QueryManager } from '../query-manager';
import { sql } from 'drizzle-orm';
import { resolveTableName } from '../../utils/query-helpers';

// Type imports for different Drizzle database types
type DrizzleDatabase = any; // We use 'any' to avoid exposing Drizzle types

/**
 * DrizzleAdapter implementation
 * 
 * Provides database operations using Drizzle ORM while maintaining
 * the stable DatabaseAdapter interface.
 */
export class DrizzleAdapter extends DatabaseAdapter {
  private db: DrizzleDatabase | null = null;
  private client: any = null; // Underlying database client
  private connected = false;
  private queryManager: QueryManager;
  private dbType: 'postgres' | 'sqlite' | 'mysql';

  constructor(config: DatabaseAdapterConfig) {
    super(config);
    this.dbType = config.type || 'sqlite';
    this.queryManager = new QueryManager(this);
  }

  /**
   * Connect to the database using Drizzle
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
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
      throw new DatabaseError('connect', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgres(): Promise<void> {
    const { Client } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    
    this.client = new Client({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      database: this.config.database || 'postgres',
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: this.config.connectionTimeout || 30000,
    });
    
    await this.client.connect();
    this.db = drizzle(this.client);
  }

  /**
   * Connect to MySQL
   */
  private async connectMySQL(): Promise<void> {
    const mysql = await import('mysql2/promise');
    const { drizzle } = await import('drizzle-orm/mysql2');
    
    this.client = await mysql.createConnection({
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      connectTimeout: this.config.connectionTimeout || 30000,
    });
    
    this.db = drizzle(this.client);
  }

  /**
   * Connect to SQLite
   */
  private async connectSQLite(): Promise<void> {
    const Database = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    
    const filename = this.config.filename || ':memory:';
    this.client = new Database.default(filename);
    
    // Enable foreign keys for SQLite
    this.client.pragma('foreign_keys = ON');
    
    // Set WAL mode for better concurrency (not for in-memory)
    if (filename !== ':memory:') {
      this.client.pragma('journal_mode = WAL');
    }
    
    this.db = drizzle(this.client);
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      switch (this.dbType) {
        case 'postgres':
          if (this.client?.end) {
            await this.client.end();
          }
          break;
          
        case 'mysql':
          if (this.client?.end) {
            await this.client.end();
          }
          break;
          
        case 'sqlite':
          if (this.client?.close) {
            this.client.close();
          }
          break;
      }
      
      this.db = null;
      this.client = null;
      this.connected = false;
    } catch (error) {
      throw new DatabaseError('disconnect', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Check if connected to the database
   */
  isConnected(): boolean {
    return this.connected && this.db !== null;
  }

  /**
   * Execute a query that returns rows
   */
  async query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      // Use Drizzle's sql template tag for safe query execution
      const query = params && params.length > 0
        ? sql.raw(this.prepareSql(sqlQuery, params))
        : sql.raw(sqlQuery);
        
      const result = await this.db!.execute(query);
      
      // Handle different result formats from different databases
      if (Array.isArray(result)) {
        return result as T[];
      } else if (result.rows) {
        return result.rows as T[];
      } else {
        return result as T[];
      }
    } catch (error) {
      throw new DatabaseError('query', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { sql: sqlQuery, params }
      });
    }
  }

  /**
   * Execute a query that doesn't return rows
   */
  async execute(sqlQuery: string, params?: any[]): Promise<{ changes: number; lastInsertId?: string | number }> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = params && params.length > 0
        ? sql.raw(this.prepareSql(sqlQuery, params))
        : sql.raw(sqlQuery);
        
      const result = await this.db!.execute(query);
      
      // Extract changes and lastInsertId based on database type
      let changes = 0;
      let lastInsertId: string | number | undefined;
      
      switch (this.dbType) {
        case 'postgres':
          changes = result.rowCount || 0;
          lastInsertId = result.rows?.[0]?.id;
          break;
          
        case 'mysql':
          changes = result.affectedRows || 0;
          lastInsertId = result.insertId;
          break;
          
        case 'sqlite':
          changes = result.changes || 0;
          lastInsertId = result.lastInsertRowid;
          break;
      }
      
      return { changes, lastInsertId };
    } catch (error) {
      throw new DatabaseError('execute', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { sql: sqlQuery, params }
      });
    }
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      return await this.db!.transaction(async (tx: any) => {
        // Create a transaction-scoped adapter
        const txAdapter = Object.create(this);
        txAdapter.db = tx;
        return await callback(txAdapter);
      });
    } catch (error) {
      throw new DatabaseError('transaction', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      let query: string;
      
      switch (this.dbType) {
        case 'postgres':
          query = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
            ) as exists
          `;
          break;
          
        case 'mysql':
          query = `
            SELECT EXISTS (
              SELECT * FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = ?
            ) as \`exists\`
          `;
          break;
          
        case 'sqlite':
          query = `
            SELECT EXISTS (
              SELECT name FROM sqlite_master 
              WHERE type='table' AND name=?
            ) as 'exists'
          `;
          break;
      }
      
      const result = await this.query<{ exists: boolean | number }>(query, [tableName]);
      return Boolean(result[0]?.exists);
    } catch (error) {
      throw new DatabaseError('table_exists_check', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { tableName }
      });
    }
  }

  /**
   * Create a new table
   */
  async createTable(tableName: string, columns: ColumnDefinition[]): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const columnDefs = columns.map(col => this.buildColumnDefinition(col)).join(', ');
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      
      await this.execute(sql);
    } catch (error) {
      throw new DatabaseError('create_table', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { tableName, columns }
      });
    }
  }

  /**
   * Get column information for a table
   */
  async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      let query: string;
      
      switch (this.dbType) {
        case 'postgres':
          query = `
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable = 'NO' as "notNull",
              column_default as "default"
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `;
          break;
          
        case 'mysql':
          query = `
            SELECT 
              COLUMN_NAME as name,
              DATA_TYPE as type,
              IS_NULLABLE = 'NO' as notNull,
              COLUMN_DEFAULT as \`default\`
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = ?
            ORDER BY ORDINAL_POSITION
          `;
          break;
          
        case 'sqlite':
          query = `PRAGMA table_info(${tableName})`;
          break;
      }
      
      const result = await this.query(query, this.dbType === 'sqlite' ? [] : [tableName]);
      
      if (this.dbType === 'sqlite') {
        // Transform SQLite pragma result
        return result.map((row: any) => ({
          name: row.name,
          type: row.type,
          notNull: Boolean(row.notnull),
          default: row.dflt_value,
          primaryKey: Boolean(row.pk)
        }));
      }
      
      return result as ColumnDefinition[];
    } catch (error) {
      throw new DatabaseError('get_table_columns', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { tableName }
      });
    }
  }

  /**
   * Select records with dynamic filtering
   */
  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildSelectQuery(table, tenantId, filters, options);
      return await this.query(query.sql, query.params);
    } catch (error) {
      throw new DatabaseError('select', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, filters, options, tenantId }
      });
    }
  }

  /**
   * Insert a record
   */
  async insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildInsertQuery(table, tenantId || 'default', data);
      const result = await this.execute(query.sql, query.params);
      
      // Return the inserted record with its ID
      return {
        ...data,
        id: result.lastInsertId || data.id
      };
    } catch (error) {
      throw new DatabaseError('insert', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, data, tenantId }
      });
    }
  }

  /**
   * Update a record
   */
  async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildUpdateQuery(table, tenantId, id, data);
      const result = await this.execute(query.sql, query.params);
      
      if (result.changes === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      // Return the updated record
      return {
        id,
        ...data
      };
    } catch (error) {
      throw new DatabaseError('update', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, id, data, tenantId }
      });
    }
  }

  /**
   * Delete a record
   */
  async delete(table: string, id: string, tenantId: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildDeleteQuery(table, tenantId, id);
      const result = await this.execute(query.sql, query.params);
      
      if (result.changes === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
    } catch (error) {
      throw new DatabaseError('delete', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, id, tenantId }
      });
    }
  }

  /**
   * Count records
   */
  async count(table: string, filters: QueryFilter[], tenantId: string): Promise<number> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildCountQuery(table, tenantId, filters);
      const result = await this.query<{ count: number }>(query.sql, query.params);
      return result[0]?.count || 0;
    } catch (error) {
      throw new DatabaseError('count', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, filters, tenantId }
      });
    }
  }

  /**
   * Find a record by ID
   */
  async findById(table: string, id: string, tenantId: string): Promise<any | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const query = this.queryManager.buildFindByIdQuery(table, tenantId, id);
      const result = await this.query(query.sql, query.params);
      return result[0] || null;
    } catch (error) {
      throw new DatabaseError('find_by_id', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { table, id, tenantId }
      });
    }
  }

  /**
   * Create a database schema
   */
  async createSchema(schemaName: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      if (this.dbType === 'postgres') {
        await this.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      } else if (this.dbType === 'mysql') {
        await this.execute(`CREATE DATABASE IF NOT EXISTS ${schemaName}`);
      }
      // SQLite doesn't support schemas
    } catch (error) {
      throw new DatabaseError('create_schema', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { schemaName }
      });
    }
  }

  /**
   * Drop a database schema
   */
  async dropSchema(schemaName: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      if (this.dbType === 'postgres') {
        await this.execute(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      } else if (this.dbType === 'mysql') {
        await this.execute(`DROP DATABASE IF EXISTS ${schemaName}`);
      }
      // SQLite doesn't support schemas
    } catch (error) {
      throw new DatabaseError('drop_schema', { 
        cause: error instanceof Error ? error : new Error(String(error)),
        context: { schemaName }
      });
    }
  }

  /**
   * List all database schemas
   */
  async listSchemas(): Promise<string[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      let result: any[];
      
      switch (this.dbType) {
        case 'postgres':
          result = await this.query(
            `SELECT schema_name FROM information_schema.schemata 
             WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`
          );
          return result.map(row => row.schema_name);
          
        case 'mysql':
          result = await this.query(
            `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA 
             WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')`
          );
          return result.map(row => row.SCHEMA_NAME);
          
        case 'sqlite':
          // SQLite doesn't support schemas
          return ['main'];
      }
    } catch (error) {
      throw new DatabaseError('list_schemas', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Build column definition SQL
   */
  private buildColumnDefinition(col: ColumnDefinition): string {
    let def = `${col.name} ${this.mapDataType(col.type)}`;
    
    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    }
    
    if (col.notNull) {
      def += ' NOT NULL';
    }
    
    if (col.unique) {
      def += ' UNIQUE';
    }
    
    if (col.default !== undefined) {
      def += ` DEFAULT ${this.formatDefaultValue(col.default)}`;
    }
    
    if (col.references) {
      def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      if (col.references.onDelete) {
        def += ` ON DELETE ${col.references.onDelete}`;
      }
    }
    
    return def;
  }

  /**
   * Map generic data types to database-specific types
   */
  private mapDataType(type: string): string {
    const typeMap: Record<string, Record<string, string>> = {
      postgres: {
        string: 'VARCHAR(255)',
        text: 'TEXT',
        integer: 'INTEGER',
        bigint: 'BIGINT',
        float: 'REAL',
        double: 'DOUBLE PRECISION',
        boolean: 'BOOLEAN',
        date: 'DATE',
        datetime: 'TIMESTAMP',
        json: 'JSONB',
        uuid: 'UUID'
      },
      mysql: {
        string: 'VARCHAR(255)',
        text: 'TEXT',
        integer: 'INT',
        bigint: 'BIGINT',
        float: 'FLOAT',
        double: 'DOUBLE',
        boolean: 'BOOLEAN',
        date: 'DATE',
        datetime: 'DATETIME',
        json: 'JSON',
        uuid: 'VARCHAR(36)'
      },
      sqlite: {
        string: 'TEXT',
        text: 'TEXT',
        integer: 'INTEGER',
        bigint: 'INTEGER',
        float: 'REAL',
        double: 'REAL',
        boolean: 'INTEGER',
        date: 'TEXT',
        datetime: 'TEXT',
        json: 'TEXT',
        uuid: 'TEXT'
      }
    };
    
    return typeMap[this.dbType]?.[type.toLowerCase()] || type.toUpperCase();
  }

  /**
   * Format default value for SQL
   */
  private formatDefaultValue(value: any): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? '1' : '0';
    return String(value);
  }

  /**
   * Prepare SQL with proper parameter placeholders
   */
  private prepareSql(sqlQuery: string, params: any[]): string {
    if (this.dbType === 'postgres') {
      // Convert ? to $1, $2, etc. for PostgreSQL
      let index = 0;
      return sqlQuery.replace(/\?/g, () => `$${++index}`);
    }
    
    // MySQL and SQLite use ? placeholders
    // But we need to inline the params for sql.raw
    let index = 0;
    return sqlQuery.replace(/\?/g, () => {
      const param = params[index++];
      if (param === null) return 'NULL';
      if (typeof param === 'string') return `'${param.replace(/'/g, "''")}'`;
      if (typeof param === 'boolean') return param ? '1' : '0';
      return String(param);
    });
  }

  /**
   * Get the underlying Drizzle instance (escape hatch)
   * 
   * @warning This bypasses SchemaKit features like permissions and RLS.
   * Use with caution and only when necessary.
   */
  get drizzleInstance(): DrizzleDatabase {
    console.warn(
      'Direct Drizzle access bypasses SchemaKit features (permissions, RLS, workflows). ' +
      'Use with caution.'
    );
    return this.db;
  }
}