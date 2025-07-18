/**
 * SQLite database adapter implementation
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback } from '../adapter';
/**
 * SQLite adapter implementation
 * Uses native SQLite implementation with no external dependencies
 */
export declare class SQLiteAdapter extends DatabaseAdapter {
    private db;
    private connected;
    private statements;
    constructor(config?: DatabaseAdapterConfig);
    /**
     * Connect to SQLite database
     */
    connect(): Promise<void>;
    /**
     * Disconnect from SQLite database
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected to SQLite database
     */
    isConnected(): boolean;
    /**
     * Execute a query that returns rows
     */
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * Execute a query that doesn't return rows
     */
    execute(sql: string, params?: any[]): Promise<{
        changes: number;
        lastInsertId?: string | number;
    }>;
    /**
     * Execute a function within a transaction
     */
    transaction<T>(callback: TransactionCallback<T>): Promise<T>;
    /**
     * Check if a table exists
     */
    tableExists(tableName: string): Promise<boolean>;
    /**
     * Create a new table
     */
    createTable(tableName: string, columns: ColumnDefinition[]): Promise<void>;
    /**
     * Get column information for a table
     */
    getTableColumns(tableName: string): Promise<ColumnDefinition[]>;
}
