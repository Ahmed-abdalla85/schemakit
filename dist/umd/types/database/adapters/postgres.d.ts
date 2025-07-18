/**
 * PostgreSQL database adapter implementation
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback } from '../adapter';
/**
 * PostgreSQL adapter implementation
 * Uses native PostgreSQL implementation with no external dependencies
 */
export declare class PostgresAdapter extends DatabaseAdapter {
    private client;
    private connected;
    constructor(config?: DatabaseAdapterConfig);
    /**
     * Connect to PostgreSQL database
     */
    connect(): Promise<void>;
    /**
     * Disconnect from PostgreSQL database
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected to PostgreSQL database
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
