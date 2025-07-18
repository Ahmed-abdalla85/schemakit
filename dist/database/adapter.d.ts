/**
 * Database adapter configuration options
 */
export interface DatabaseAdapterConfig {
    filename?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    connectionString?: string;
    [key: string]: any;
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
export declare abstract class DatabaseAdapter {
    protected config: DatabaseAdapterConfig;
    /**
     * Create a new database adapter
     * @param config Configuration options
     */
    constructor(config?: DatabaseAdapterConfig);
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
    abstract execute(sql: string, params?: any[]): Promise<{
        changes: number;
        lastInsertId?: string | number;
    }>;
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
    static create(type?: string, config?: DatabaseAdapterConfig): Promise<DatabaseAdapter>;
    /**
     * Create a database adapter instance synchronously (for backward compatibility)
     * @param type Adapter type ('sqlite' or 'postgres')
     * @param config Configuration options
     */
    static createSync(type?: string, config?: DatabaseAdapterConfig): DatabaseAdapter;
}
