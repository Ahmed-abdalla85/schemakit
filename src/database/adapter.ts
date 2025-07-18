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

  /**
   * Create a database adapter instance
   * @param type Adapter type ('sqlite' or 'postgres')
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
      default:
        throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
    }
  }
  
  /**
   * Create a database adapter instance synchronously (for backward compatibility)
   * @param type Adapter type ('sqlite' or 'postgres')
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
      default:
        throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
    }
  }
}