/**
 * DatabaseManager - Main gateway for all database operations
 * 
 * This is the central point for database management, including:
 * - Adapter initialization and configuration
 * - Connection management
 * - Query building (via FluentQueryBuilder)
 * - Transaction management
 * - Database introspection
 */
import { DatabaseAdapter } from './adapter';
import { FluentQueryBuilder } from './fluent-query-builder';

// Import adapters
import { SQLiteAdapter } from './adapters/sqlite';
import { PostgresAdapter } from './adapters/postgres';
import { InMemoryAdapter } from './adapters/inmemory';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'inmemory' | 'inmemory-simplified';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string;  // For SQLite
  options?: Record<string, any>;
}

export interface ConnectionInfo {
  type: string;
  database?: string;
  host?: string;
  port?: number;
  isConnected: boolean;
  connectionTime?: Date;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: any;
}

/**
 * DatabaseManager - The main database gateway
 */
export class DatabaseManager {
  private adapter: DatabaseAdapter;
  private config: DatabaseConfig;
  private connectionTime?: Date;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.adapter = this.createAdapter(config);
  }

  // === ADAPTER MANAGEMENT ===

  /**
   * Create database adapter based on configuration
   * @param config Database configuration
   * @returns DatabaseAdapter instance
   */
  /**
   * Create a database adapter instance based on the provided configuration.
   * 
   * @param config - The database configuration object, which includes the type of adapter 
   *                 ('sqlite', 'postgres', 'inmemory'), connection parameters, and additional options.
   * 
   * @returns A DatabaseAdapter instance corresponding to the specified type. If the adapter 
   *          type is 'sqlite', a SQLiteAdapter is returned. If the type is 'postgres', a 
   *          PostgresAdapter is returned, provided that the host and database are configured; 
   *          otherwise, it falls back to an InMemorySimplifiedAdapter. If the type is 'inmemory', 
   *          an InMemoryAdapter is returned. For any unknown types, the method defaults to 
   *          returning an InMemoryAdapter.
   */
  private createAdapter(config: DatabaseConfig): DatabaseAdapter {
    switch (config.type) {
      case 'sqlite':
        return new SQLiteAdapter({ 
          filename: config.filename || ':memory:', 
          ...config.options 
        });
      
      case 'postgres':
        if (!config.host || !config.database) {
          console.warn('PostgreSQL requires host and database configuration, falling back to inmemory');
          return new InMemoryAdapter(config.options);
        }
        return new PostgresAdapter({
          host: config.host,
          port: config.port || 5432,
          user: config.user,
          password: config.password,
          database: config.database,
          ...config.options
        });
      
      case 'inmemory':
        return new InMemoryAdapter(config.options);
  
      default:
        // Fallback to inmemory-simplified for unknown types
        return new InMemoryAdapter(config.options);
    }
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
    this.connectionTime = new Date();
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.connectionTime = undefined;
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      type: this.config.type,
      database: this.config.database,
      host: this.config.host,
      port: this.config.port,
      isConnected: !!this.connectionTime,
      connectionTime: this.connectionTime
    };
  }

  /**
   * Get the underlying database adapter
   */
  getAdapter(): DatabaseAdapter {
    return this.adapter;
  }

  // === FLUENT QUERY INTERFACE ===

  /**
   * Create a fluent query builder for a table
   * @param tableName Table name
   * @param tenantId Tenant ID (optional)
   * @returns FluentQueryBuilder instance
   */
  table(tableName: string, tenantId = 'default'): FluentQueryBuilder {
    return new FluentQueryBuilder(this.adapter, tableName, tenantId);
  }

  /**
   * Alias for table() method
   * @param tableName Table name
   * @param tenantId Tenant ID (optional)
   * @returns FluentQueryBuilder instance
   */
  db(tableName: string, tenantId = 'default'): FluentQueryBuilder {
    return this.table(tableName, tenantId);
  }

  // === RAW QUERY METHODS ===

  /**
   * Execute a raw SQL query
   * @param sql SQL query
   * @param params Query parameters
   * @returns Query results
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return await this.adapter.query<T>(sql, params);
  }

  /**
   * Execute a raw SQL statement
   * @param sql SQL statement
   * @param params Statement parameters
   * @returns Execution result
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    return await this.adapter.execute(sql, params);
  }

  // === TRANSACTION MANAGEMENT ===

  /**
   * Execute operations within a transaction
   * @param callback Transaction callback
   * @returns Callback result
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.adapter.transaction(callback);
  }

  // === DATABASE INTROSPECTION ===

  /**
   * Check if a table exists
   * @param tableName Table name
   * @returns True if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    return await this.adapter.tableExists(tableName);
  }

  /**
   * Get table information
   * @param tableName Table name
   * @returns Table information
   */
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    const exists = await this.tableExists(tableName);
    if (!exists) {
      return null;
    }

    // Get columns information
    const columns = await this.getTableColumns(tableName);
    
    return {
      name: tableName,
      columns
    };
  }

  /**
   * Get column information for a table
   * @param tableName Table name
   * @returns Array of column information
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    // This is adapter-specific, we'll provide a basic implementation
    try {
      let sql: string;
      
      switch (this.config.type) {
        case 'sqlite':
          sql = `PRAGMA table_info(${tableName})`;
          break;
        case 'postgres':
          sql = `
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable = 'YES' as nullable,
              column_default as "defaultValue"
            FROM information_schema.columns 
            WHERE table_name = ?
            ORDER BY ordinal_position
          `;
          break;
        default:
          // For in-memory adapters, return basic info
          return [];
      }

      const result = await this.query(sql, [tableName]);
      
      if (this.config.type === 'sqlite') {
        return result.map((row: any) => ({
          name: row.name,
          type: row.type,
          nullable: !row.notnull,
          primaryKey: !!row.pk,
          unique: false, // SQLite pragma doesn't provide this easily
          defaultValue: row.dflt_value
        }));
      } else {
        return result.map((row: any) => ({
          name: row.name,
          type: row.type,
          nullable: row.nullable,
          primaryKey: false, // Would need separate query
          unique: false, // Would need separate query
          defaultValue: row.defaultValue
        }));
      }
    } catch (error) {
      console.warn(`Failed to get column info for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * List all tables in the database
   * @returns Array of table names
   */
  async listTables(): Promise<string[]> {
    try {
      let sql: string;
      
      switch (this.config.type) {
        case 'sqlite':
          sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
          break;
        case 'postgres':
          sql = "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'";
          break;
        default:
          // For in-memory adapters
          return [];
      }

      const result = await this.query(sql);
      return result.map((row: any) => row.name);
    } catch (error) {
      console.warn('Failed to list tables:', error);
      return [];
    }
  }

  // === SCHEMA MANAGEMENT ===

  /**
   * Create a table
   * @param tableName Table name
   * @param columns Column definitions
   */
  async createTable(tableName: string, columns: Array<{
    name: string;
    type: string;
    primaryKey?: boolean;
    notNull?: boolean;
    unique?: boolean;
    default?: any;
  }>): Promise<void> {
    await this.adapter.createTable(tableName, columns);
  }

  /**
   * Drop a table
   * @param tableName Table name
   */
  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    await this.execute(sql);
  }

  /**
   * Truncate a table (remove all data)
   * @param tableName Table name
   */
  async truncateTable(tableName: string): Promise<void> {
    const sql = `DELETE FROM ${tableName}`;
    await this.execute(sql);
  }

  // === UTILITY METHODS ===

  /**
   * Test database connection
   * @returns True if connection is working
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1 as test');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database version information
   * @returns Version string or null
   */
  async getVersion(): Promise<string | null> {
    try {
      let sql: string;
      
      switch (this.config.type) {
        case 'sqlite':
          sql = 'SELECT sqlite_version() as version';
          break;
        case 'postgres':
          sql = 'SELECT version() as version';
          break;
        default:
          return `${this.config.type}-adapter`;
      }

      const result = await this.query(sql);
      return result.length > 0 ? result[0].version : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get database configuration (without sensitive data)
   * @returns Sanitized configuration
   */
  getConfig(): Omit<DatabaseConfig, 'password'> {
    const { password, ...safeConfig } = this.config;
    return safeConfig;
  }
}