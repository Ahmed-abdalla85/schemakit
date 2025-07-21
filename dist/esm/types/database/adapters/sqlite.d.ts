/**
 * SQLite database adapter implementation
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from '../adapter';
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
    /**
     * Select records with tenant-aware filtering (EntityKit pattern)
     */
    select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]>;
    /**
     * Insert a record with tenant context (EntityKit pattern)
     */
    insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any>;
    /**
     * Update a record with tenant context (EntityKit pattern)
     */
    update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any>;
    /**
     * Delete a record with tenant context (EntityKit pattern)
     */
    delete(table: string, id: string, tenantId: string): Promise<void>;
    /**
     * Count records with tenant-aware filtering (EntityKit pattern)
     */
    count(table: string, filters: QueryFilter[], tenantId: string): Promise<number>;
    /**
     * Find a record by ID with tenant context (EntityKit pattern)
     */
    findById(table: string, id: string, tenantId: string): Promise<any | null>;
    /**
     * Create a database schema (simulated with table prefix validation)
     */
    createSchema(schemaName: string): Promise<void>;
    /**
     * Drop a database schema (simulated by dropping all prefixed tables)
     */
    dropSchema(schemaName: string): Promise<void>;
    /**
     * List all database schemas (simulated by extracting prefixes from table names)
     */
    listSchemas(): Promise<string[]>;
    private buildSQLiteSelectQuery;
    private buildSQLiteInsertQuery;
    private buildSQLiteUpdateQuery;
    private buildSQLiteCountQuery;
    private mapSQLiteOperator;
}
