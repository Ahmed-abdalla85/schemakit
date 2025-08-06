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
import { sql, eq, ne, gt, lt, gte, lte, like, inArray, notInArray, and, or, desc, asc } from 'drizzle-orm';

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
  private dbType: 'postgres' | 'sqlite' | 'mysql';

  constructor(config: DatabaseAdapterConfig) {
    super(config);
    this.dbType = config.type || 'sqlite';
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
      // For raw queries, we still need to use sql.raw
      // But we properly parameterize based on database type
      let finalSql: string;
      
      if (params && params.length > 0) {
        if (this.dbType === 'postgres') {
          // PostgreSQL uses $1, $2, etc.
          finalSql = sqlQuery;
          let index = 0;
          finalSql = finalSql.replace(/\?/g, () => `$${++index}`);
        } else {
          // MySQL and SQLite use ?
          finalSql = sqlQuery;
        }
      } else {
        finalSql = sqlQuery;
      }
      
      const result = await this.db!.execute(sql.raw(finalSql));
      
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
      // Similar to query, but for execute statements
      let finalSql: string;
      
      if (params && params.length > 0) {
        if (this.dbType === 'postgres') {
          finalSql = sqlQuery;
          let index = 0;
          finalSql = finalSql.replace(/\?/g, () => `$${++index}`);
        } else {
          finalSql = sqlQuery;
        }
      } else {
        finalSql = sqlQuery;
      }
      
      const result = await this.db!.execute(sql.raw(finalSql));
      
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
      const sqlQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      
      await this.execute(sqlQuery);
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
   * Uses Drizzle's query builder for better performance and safety
   */
  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      // For dynamic tables, we need to use raw SQL since we don't have schema definitions
      // But we'll build it more safely using Drizzle's sql template
      const conditions: any[] = [];
      const values: any[] = [];
      
      // Add tenant condition if not default
      if (tenantId && tenantId !== 'default') {
        conditions.push(`tenant_id = ${this.getPlaceholder(values.length)}`);
        values.push(tenantId);
      }
      
      // Add filter conditions
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, values);
        if (condition) {
          conditions.push(condition);
        }
      }
      
      // Build the query
      let query = `SELECT * FROM ${this.escapeIdentifier(table)}`;
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // Add ordering
      if (options.orderBy && options.orderBy.length > 0) {
        const orderClauses = options.orderBy.map(o => 
          `${this.escapeIdentifier(o.field)} ${o.direction}`
        );
        query += ` ORDER BY ${orderClauses.join(', ')}`;
      }
      
      // Add limit
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      // Add offset
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      return await this.query(query, values);
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
      // Add tenant_id to data if provided
      const insertData = tenantId && tenantId !== 'default' 
        ? { ...data, tenant_id: tenantId }
        : data;
      
      const fields = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = values.map((_, index) => this.getPlaceholder(index)).join(', ');
      
      const query = `INSERT INTO ${this.escapeIdentifier(table)} (${fields.map(f => this.escapeIdentifier(f)).join(', ')}) VALUES (${placeholders})`;
      
      // For PostgreSQL, add RETURNING clause to get the inserted record
      const finalQuery = this.dbType === 'postgres' ? `${query} RETURNING *` : query;
      
      const result = await this.execute(finalQuery, values);
      
      // Return the inserted record with its ID
      if (this.dbType === 'postgres' && result.lastInsertId) {
        // PostgreSQL returns the full record
        return result.lastInsertId;
      } else {
        return {
          ...insertData,
          id: result.lastInsertId || insertData.id
        };
      }
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
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setClauses = fields.map((field, index) => 
        `${this.escapeIdentifier(field)} = ${this.getPlaceholder(index)}`
      ).join(', ');
      
      // Add ID to values
      values.push(id);
      
      // Build WHERE clause
      const whereConditions = [`id = ${this.getPlaceholder(values.length - 1)}`];
      
      // Add tenant condition
      if (tenantId && tenantId !== 'default') {
        values.push(tenantId);
        whereConditions.push(`tenant_id = ${this.getPlaceholder(values.length - 1)}`);
      }
      
      const query = `UPDATE ${this.escapeIdentifier(table)} SET ${setClauses} WHERE ${whereConditions.join(' AND ')}`;
      
      const result = await this.execute(query, values);
      
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
      const values = [id];
      const whereConditions = [`id = ${this.getPlaceholder(0)}`];
      
      // Add tenant condition
      if (tenantId && tenantId !== 'default') {
        values.push(tenantId);
        whereConditions.push(`tenant_id = ${this.getPlaceholder(values.length - 1)}`);
      }
      
      const query = `DELETE FROM ${this.escapeIdentifier(table)} WHERE ${whereConditions.join(' AND ')}`;
      
      const result = await this.execute(query, values);
      
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
      const conditions: string[] = [];
      const values: any[] = [];
      
      // Add tenant condition
      if (tenantId && tenantId !== 'default') {
        conditions.push(`tenant_id = ${this.getPlaceholder(values.length)}`);
        values.push(tenantId);
      }
      
      // Add filter conditions
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter, values);
        if (condition) {
          conditions.push(condition);
        }
      }
      
      let query = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(table)}`;
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const result = await this.query<{ count: number }>(query, values);
      return Number(result[0]?.count) || 0;
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
      const values = [id];
      const whereConditions = [`id = ${this.getPlaceholder(0)}`];
      
      // Add tenant condition
      if (tenantId && tenantId !== 'default') {
        values.push(tenantId);
        whereConditions.push(`tenant_id = ${this.getPlaceholder(values.length - 1)}`);
      }
      
      const query = `SELECT * FROM ${this.escapeIdentifier(table)} WHERE ${whereConditions.join(' AND ')} LIMIT 1`;
      
      const result = await this.query(query, values);
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
        await this.execute(`CREATE SCHEMA IF NOT EXISTS ${this.escapeIdentifier(schemaName)}`);
      } else if (this.dbType === 'mysql') {
        await this.execute(`CREATE DATABASE IF NOT EXISTS ${this.escapeIdentifier(schemaName)}`);
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
        await this.execute(`DROP SCHEMA IF EXISTS ${this.escapeIdentifier(schemaName)} CASCADE`);
      } else if (this.dbType === 'mysql') {
        await this.execute(`DROP DATABASE IF EXISTS ${this.escapeIdentifier(schemaName)}`);
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
    let def = `${this.escapeIdentifier(col.name)} ${this.mapDataType(col.type)}`;
    
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
      def += ` REFERENCES ${this.escapeIdentifier(col.references.table)}(${this.escapeIdentifier(col.references.column)})`;
      if (col.references.onDelete) {
        def += ` ON DELETE ${col.references.onDelete}`;
      }
    }
    
    return def;
  }

  /**
   * Build a filter condition for WHERE clause
   */
  private buildFilterCondition(filter: QueryFilter, values: any[]): string {
    const field = this.escapeIdentifier(filter.field);
    const placeholder = this.getPlaceholder(values.length);
    
    switch (filter.operator || 'eq') {
      case 'eq':
        values.push(filter.value);
        return `${field} = ${placeholder}`;
        
      case 'neq':
        values.push(filter.value);
        return `${field} != ${placeholder}`;
        
      case 'gt':
        values.push(filter.value);
        return `${field} > ${placeholder}`;
        
      case 'lt':
        values.push(filter.value);
        return `${field} < ${placeholder}`;
        
      case 'gte':
        values.push(filter.value);
        return `${field} >= ${placeholder}`;
        
      case 'lte':
        values.push(filter.value);
        return `${field} <= ${placeholder}`;
        
      case 'like':
        values.push(filter.value);
        return `${field} LIKE ${placeholder}`;
        
      case 'in':
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map((_, i) => {
            values.push(filter.value[i]);
            return this.getPlaceholder(values.length - 1);
          }).join(', ');
          return `${field} IN (${placeholders})`;
        }
        return '1=1'; // Always true if empty array
        
      case 'nin':
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map((_, i) => {
            values.push(filter.value[i]);
            return this.getPlaceholder(values.length - 1);
          }).join(', ');
          return `${field} NOT IN (${placeholders})`;
        }
        return '1=1'; // Always true if empty array
        
      case 'contains':
        values.push(`%${filter.value}%`);
        return `${field} LIKE ${placeholder}`;
        
      case 'startswith':
        values.push(`${filter.value}%`);
        return `${field} LIKE ${placeholder}`;
        
      case 'endswith':
        values.push(`%${filter.value}`);
        return `${field} LIKE ${placeholder}`;
        
      default:
        values.push(filter.value);
        return `${field} = ${placeholder}`;
    }
  }

  /**
   * Get parameter placeholder based on database type
   */
  private getPlaceholder(index: number): string {
    return this.dbType === 'postgres' ? `$${index + 1}` : '?';
  }

  /**
   * Escape identifier (table/column name) based on database type
   */
  private escapeIdentifier(identifier: string): string {
    switch (this.dbType) {
      case 'postgres':
        return `"${identifier.replace(/"/g, '""')}"`;
      case 'mysql':
        return `\`${identifier.replace(/`/g, '``')}\``;
      case 'sqlite':
        return `"${identifier.replace(/"/g, '""')}"`;
    }
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
    if (value === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return this.dbType === 'sqlite' ? (value ? '1' : '0') : String(value);
    return String(value);
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