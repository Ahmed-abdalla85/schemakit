/**
 * SQLite database adapter implementation
 * Supports better-sqlite3 when available, falls back to in-memory mock for zero-dependency
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from '../adapter';
/**
 * SQLite adapter implementation
 * Uses better-sqlite3 when available, with fallback to in-memory implementation
 */
export declare class SQLiteAdapter extends DatabaseAdapter {
    private db;
    private connected;
    private inTransaction;
    private Database;
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
     * Check if connected to the database
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
    /**
     * Select records with tenant-aware filtering
     */
    select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]>;
    /**
     * Insert a record with tenant context
     */
    insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any>;
    /**
     * Update a record with tenant context
     */
    update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any>;
    /**
     * Delete a record with tenant context
     */
    delete(table: string, id: string, tenantId: string): Promise<void>;
    /**
     * Count records with tenant-aware filtering
     */
    count(table: string, filters: QueryFilter[], tenantId: string): Promise<number>;
    /**
     * Find a record by ID with tenant context
     */
    findById(table: string, id: string, tenantId: string): Promise<any | null>;
    /**
     * Create a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    createSchema(schemaName: string): Promise<void>;
    /**
     * Drop a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    dropSchema(schemaName: string): Promise<void>;
    /**
     * List all database schemas (SQLite doesn't support schemas)
     */
    listSchemas(): Promise<string[]>;
    /**
     * Map generic column types to SQLite types
     */
    private mapColumnType;
    /**
     * Build filter clause for a QueryFilter
     */
    private buildFilterClause;
}
/**
 * Factory function to create SQLite adapter
 */
export declare function createSQLiteAdapter(config?: DatabaseAdapterConfig): SQLiteAdapter;
