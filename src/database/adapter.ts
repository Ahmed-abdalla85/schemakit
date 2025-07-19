/**
 * Database adapter interface and factory
 */
import { DatabaseError } from '../errors';

/**
 * Database adapter configuration options
 */
export interface DatabaseAdapterConfig {
  filename?: string;        // For SQLite
  host?: string;            // For PostgreSQL
  port?: number;            // For PostgreSQL
  database?: string;        // For PostgreSQL
  user?: string;            // For PostgreSQL
  password?: string;        // For PostgreSQL
  ssl?: boolean;            // For PostgreSQL
  connectionString?: string; // For PostgreSQL
  [key: string]: any;       // Other options
}

/**
 * Column definition for table creation
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: any;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL';
  };
}

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (transaction: DatabaseAdapter) => Promise<T>;

/**
 * Query filter interface (from EntityKit pattern)
 */
export interface QueryFilter {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith';
}

/**
 * Query options interface (from EntityKit pattern)
 */
export interface QueryOptions {
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

/**
 * Abstract database adapter class
 */
export abstract class DatabaseAdapter {
  protected config: DatabaseAdapterConfig;
  
  /**
   * Create a new database adapter
   * @param config Configuration options
   */
  constructor(config: DatabaseAdapterConfig = {}) {
    this.config = config;
  }

  /**
   * Connect to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if connected to the database
   */
  abstract isConnected(): boolean;

  /**
   * Execute a query that returns rows
   * @param sql SQL query
   * @param params Query parameters
   */
  abstract query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Execute a query that doesn't return rows
   * @param sql SQL query
   * @param params Query parameters
   */
  abstract execute(sql: string, params?: any[]): Promise<{ changes: number, lastInsertId?: string | number }>;

  /**
   * Execute a function within a transaction
   * @param callback Function to execute within transaction
   */
  abstract transaction<T>(callback: TransactionCallback<T>): Promise<T>;

  /**
   * Check if a table exists
   * @param tableName Table name
   */
  abstract tableExists(tableName: string): Promise<boolean>;

  /**
   * Create a new table
   * @param tableName Table name
   * @param columns Column definitions
   */
  abstract createTable(tableName: string, columns: ColumnDefinition[]): Promise<void>;

  /**
   * Get column information for a table
   * @param tableName Table name
   */
  abstract getTableColumns(tableName: string): Promise<ColumnDefinition[]>;

  // ===== EntityKit-style multi-tenant methods =====

  /**
   * Select records with tenant-aware filtering (EntityKit pattern)
   * @param table Table name
   * @param filters Query filters
   * @param options Query options
   * @param tenantId Tenant identifier (schema name)
   */
  abstract select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]>;

  /**
   * Insert a record with tenant context (EntityKit pattern)
   * @param table Table name
   * @param data Data to insert
   * @param tenantId Tenant identifier (schema name)
   */
  abstract insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any>;

  /**
   * Update a record with tenant context (EntityKit pattern)
   * @param table Table name
   * @param id Record ID
   * @param data Data to update
   * @param tenantId Tenant identifier (schema name)
   */
  abstract update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any>;

  /**
   * Delete a record with tenant context (EntityKit pattern)
   * @param table Table name
   * @param id Record ID
   * @param tenantId Tenant identifier (schema name)
   */
  abstract delete(table: string, id: string, tenantId: string): Promise<void>;

  /**
   * Count records with tenant-aware filtering (EntityKit pattern)
   * @param table Table name
   * @param filters Query filters
   * @param tenantId Tenant identifier (schema name)
   */
  abstract count(table: string, filters: QueryFilter[], tenantId: string): Promise<number>;

  /**
   * Find a record by ID with tenant context (EntityKit pattern)
   * @param table Table name
   * @param id Record ID
   * @param tenantId Tenant identifier (schema name)
   */
  abstract findById(table: string, id: string, tenantId: string): Promise<any | null>;

  // ===== Schema management methods =====

  /**
   * Create a database schema (for multi-tenancy)
   * @param schemaName Schema name
   */
  abstract createSchema(schemaName: string): Promise<void>;

  /**
   * Drop a database schema
   * @param schemaName Schema name
   */
  abstract dropSchema(schemaName: string): Promise<void>;

  /**
   * List all database schemas
   */
  abstract listSchemas(): Promise<string[]>;

  /**
   * Create a database adapter instance
   * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
   * @param config Configuration options
   */
  static async create(type = 'sqlite', config: DatabaseAdapterConfig = {}): Promise<DatabaseAdapter> {
    switch (type.toLowerCase()) {
      case 'sqlite':
        // Import SQLiteAdapter using dynamic import
        const { SQLiteAdapter } = await import('./adapters/sqlite');
        return new SQLiteAdapter(config);
      case 'postgres':
        // Import PostgresAdapter using dynamic import
        const { PostgresAdapter } = await import('./adapters/postgres');
        return new PostgresAdapter(config);
      case 'inmemory':
        // Import InMemoryAdapter using dynamic import
        const { InMemoryAdapter } = await import('./adapters/inmemory');
        return new InMemoryAdapter(config);
      default:
        throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
    }
  }
  
  /**
   * Create a database adapter instance synchronously (for backward compatibility)
   * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
   * @param config Configuration options
   */
  static createSync(type = 'sqlite', config: DatabaseAdapterConfig = {}): DatabaseAdapter {
    switch (type.toLowerCase()) {
      case 'sqlite':
        // Import SQLiteAdapter
        // Using dynamic import would be better but we need synchronous behavior here
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SQLiteAdapter } = require('./adapters/sqlite') as { SQLiteAdapter: new (config: DatabaseAdapterConfig) => DatabaseAdapter };
        return new SQLiteAdapter(config);
      case 'postgres':
        // Import PostgresAdapter
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PostgresAdapter } = require('./adapters/postgres') as { PostgresAdapter: new (config: DatabaseAdapterConfig) => DatabaseAdapter };
        return new PostgresAdapter(config);
      case 'inmemory':
        // Import InMemoryAdapter
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { InMemoryAdapter } = require('./adapters/inmemory') as { InMemoryAdapter: new (config: DatabaseAdapterConfig) => DatabaseAdapter };
        return new InMemoryAdapter(config);
      default:
        throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
    }
  }
}