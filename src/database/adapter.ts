/**
 * Database adapter interface and factory
 * 
 * This is a stable contract that all database adapters must implement.
 * It provides ORM-agnostic database operations for SchemaKit.
 * 
 * @important This interface must NOT expose any ORM-specific types
 */
import { DatabaseError } from '../errors';

/**
 * Database adapter configuration options
 * Generic configuration that works across different database types
 */
export interface DatabaseAdapterConfig {
  // Database type
  type?: 'postgres' | 'sqlite' | 'mysql' | 'inmemory';
  
  // Common connection options
  filename?: string;        // For SQLite
  host?: string;            // For PostgreSQL/MySQL
  port?: number;            // For PostgreSQL/MySQL
  database?: string;        // For PostgreSQL/MySQL
  user?: string;            // For PostgreSQL/MySQL
  password?: string;        // For PostgreSQL/MySQL
  ssl?: boolean;            // For PostgreSQL/MySQL
  connectionString?: string; // For PostgreSQL/MySQL
  
  // Connection pool options
  poolMin?: number;
  poolMax?: number;
  connectionTimeout?: number;
  
  // Other options
  [key: string]: any;
}

/**
 * Column definition for table creation
 * ORM-agnostic column specification
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
 * The callback receives a transaction-scoped adapter instance
 */
export type TransactionCallback<T> = (transaction: DatabaseAdapter) => Promise<T>;

/**
 * Query filter interface for dynamic queries
 * Used by SchemaKit for runtime query building
 */
export interface QueryFilter {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith';
}

/**
 * Query options for pagination and sorting
 */
export interface QueryOptions {
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  offset?: number;
  select?: string[]; // Field selection
}

/**
 * Query result metadata
 */
export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields?: Array<{ name: string; type: string }>;
}

/**
 * Abstract database adapter class
 * 
 * This is the stable contract that all adapters must implement.
 * SchemaKit features (permissions, RLS, workflows) are built on top of this.
 */
export abstract class DatabaseAdapter {
  protected config: DatabaseAdapterConfig;
  
  constructor(config: DatabaseAdapterConfig = {}) {
    this.config = config;
  }

  // ===== Connection Management =====
  
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

  // ===== Core Query Execution =====
  
  /**
   * Execute a query that returns rows
   * @param sql SQL query string
   * @param params Query parameters (prevents SQL injection)
   * @returns Array of result rows
   */
  abstract query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Execution result with affected rows and last insert ID
   */
  abstract execute(sql: string, params?: any[]): Promise<{ 
    changes: number; 
    lastInsertId?: string | number;
  }>;

  /**
   * Execute a function within a database transaction
   * @param callback Function to execute within transaction
   * @returns Result of the callback function
   */
  abstract transaction<T>(callback: TransactionCallback<T>): Promise<T>;

  // ===== Schema Introspection =====
  
  /**
   * Check if a table exists in the database
   * @param tableName Name of the table
   * @returns True if table exists
   */
  abstract tableExists(tableName: string): Promise<boolean>;

  /**
   * Create a new table
   * @param tableName Name of the table to create
   * @param columns Column definitions
   */
  abstract createTable(tableName: string, columns: ColumnDefinition[]): Promise<void>;

  /**
   * Get column information for a table
   * @param tableName Name of the table
   * @returns Array of column definitions
   */
  abstract getTableColumns(tableName: string): Promise<ColumnDefinition[]>;

  // ===== SchemaKit Dynamic Query Methods =====
  // These methods support SchemaKit's runtime schema features
  
  /**
   * Select records with dynamic filtering
   * Used by SchemaKit for runtime entity queries
   * 
   * @param table Table name (may be dynamically determined)
   * @param filters Dynamic query filters
   * @param options Query options (pagination, sorting)
   * @param tenantId Tenant context for multi-tenancy
   * @returns Array of matching records
   */
  abstract select(
    table: string, 
    filters: QueryFilter[], 
    options: QueryOptions,
    tenantId: string
  ): Promise<any[]>;

  /**
   * Insert a record into a dynamic table
   * 
   * @param table Table name
   * @param data Record data
   * @param tenantId Optional tenant context
   * @returns Inserted record with generated ID
   */
  abstract insert(
    table: string, 
    data: Record<string, any>,
    tenantId?: string
  ): Promise<any>;

  /**
   * Update a record in a dynamic table
   * 
   * @param table Table name
   * @param id Record ID
   * @param data Updated data
   * @param tenantId Tenant context
   * @returns Updated record
   */
  abstract update(
    table: string, 
    id: string,
    data: Record<string, any>,
    tenantId: string
  ): Promise<any>;

  /**
   * Delete a record from a dynamic table
   * 
   * @param table Table name
   * @param id Record ID
   * @param tenantId Tenant context
   */
  abstract delete(
    table: string, 
    id: string,
    tenantId: string
  ): Promise<void>;

  /**
   * Count records with dynamic filtering
   * 
   * @param table Table name
   * @param filters Query filters
   * @param tenantId Tenant context
   * @returns Number of matching records
   */
  abstract count(
    table: string, 
    filters: QueryFilter[], 
    tenantId: string
  ): Promise<number>;

  /**
   * Find a single record by ID
   * 
   * @param table Table name
   * @param id Record ID
   * @param tenantId Tenant context
   * @returns Record or null if not found
   */
  abstract findById(
    table: string, 
    id: string, 
    tenantId: string
  ): Promise<any | null>;

  // ===== Schema Management (Multi-tenancy) =====
  
  /**
   * Create a database schema (for schema-based multi-tenancy)
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
   * @returns Array of schema names
   */
  abstract listSchemas(): Promise<string[]>;

  // ===== Factory Method =====
  
  /**
   * Create a database adapter instance
   * @param type Adapter type ('postgres', 'sqlite', 'mysql', or 'inmemory')
   * @param config Configuration options
   * @returns DatabaseAdapter instance
   */
  static async create(type = 'sqlite', config: DatabaseAdapterConfig = {}): Promise<DatabaseAdapter> {
    const adapterConfig = { ...config, type };
    
    switch (type.toLowerCase()) {
      case 'postgres':
      case 'sqlite':
      case 'mysql':
        // Use DrizzleAdapter for all SQL databases
        const { DrizzleAdapter } = await import('./adapters/drizzle');
        return new DrizzleAdapter(adapterConfig);
        
      case 'inmemory':
        // Keep InMemoryAdapter for testing
        const { InMemoryAdapter } = await import('./adapters/inmemory');
        return new InMemoryAdapter(adapterConfig);
        
      default:
        throw new DatabaseError('create', { 
          cause: new Error(`Unsupported adapter type: ${type}`) 
        });
    }
  }
  
  /**
   * Create a database adapter instance synchronously
   * @deprecated Use create() instead for better performance
   */
  static createSync(type = 'sqlite', config: DatabaseAdapterConfig = {}): DatabaseAdapter {
    const adapterConfig = { ...config, type };
    
    switch (type.toLowerCase()) {
      case 'postgres':
      case 'sqlite':
      case 'mysql':
        // Use require for synchronous loading
        const { DrizzleAdapter } = require('./adapters/drizzle');
        return new DrizzleAdapter(adapterConfig);
        
      case 'inmemory':
        const { InMemoryAdapter } = require('./adapters/inmemory');
        return new InMemoryAdapter(adapterConfig);
        
      default:
        throw new DatabaseError('create', { 
          cause: new Error(`Unsupported adapter type: ${type}`) 
        });
    }
  }
}