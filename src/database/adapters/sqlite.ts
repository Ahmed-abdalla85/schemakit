/**
 * SQLite database adapter implementation
 * Supports better-sqlite3 when available, falls back to in-memory mock for zero-dependency
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from '../adapter';
import { DatabaseError } from '../../errors';
// Removed processFilterValue import as it's not needed

/**
 * SQLite adapter implementation
 * Uses better-sqlite3 when available, with fallback to in-memory implementation
 */
export class SQLiteAdapter extends DatabaseAdapter {
    private db: any = null;
    private connected = false;
    private inTransaction = false;
    private Database: any = null;

    constructor(config: DatabaseAdapterConfig = {}) {
        super(config);
        // Default SQLite database to in-memory if not specified
        this.config.filename = this.config.filename || ':memory:';
    }

    /**
     * Connect to SQLite database
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            // Try to load better-sqlite3 if available
            try {
                this.Database = require('better-sqlite3');
                this.db = new this.Database(this.config.filename);
                
                // Enable foreign keys
                this.db.pragma('foreign_keys = ON');
                
                // Set WAL mode for better concurrency
                if (this.config.filename !== ':memory:') {
                    this.db.pragma('journal_mode = WAL');
                }
                
                this.connected = true;
                console.log(`Connected to SQLite database: ${this.config.filename}`);
            } catch (error) {
                // If better-sqlite3 is not available, throw an error
                throw new DatabaseError(
                    'SQLite adapter requires better-sqlite3. Please install it: npm install better-sqlite3',
                    'CONNECTION_ERROR'
                );
            }
        } catch (error) {
            throw new DatabaseError(`Failed to connect to SQLite: ${error}`, 'CONNECTION_ERROR');
        }
    }

    /**
     * Disconnect from SQLite database
     */
    async disconnect(): Promise<void> {
        if (!this.connected) return;

        try {
            if (this.db && this.db.close) {
                this.db.close();
            }
            this.db = null;
            this.connected = false;
        } catch (error) {
            throw new DatabaseError(`Failed to disconnect from SQLite: ${error}`, 'CONNECTION_ERROR');
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
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const stmt = this.db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            return result as T[];
        } catch (error) {
            throw new DatabaseError(`Query failed: ${error}\nSQL: ${sql}`, 'QUERY_ERROR');
        }
    }

    /**
     * Execute a query that doesn't return rows
     */
    async execute(sql: string, params?: any[]): Promise<{ changes: number, lastInsertId?: string | number }> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const stmt = this.db.prepare(sql);
            const result = params ? stmt.run(...params) : stmt.run();
            
            return {
                changes: result.changes,
                lastInsertId: result.lastInsertRowid
            };
        } catch (error) {
            throw new DatabaseError(`Execute failed: ${error}\nSQL: ${sql}`, 'EXECUTE_ERROR');
        }
    }

    /**
     * Execute a function within a transaction
     */
    async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
        if (!this.isConnected()) {
            await this.connect();
        }

        if (this.inTransaction) {
            // Already in a transaction, just execute the callback
            return await callback(this);
        }

        this.inTransaction = true;
        
        try {
            const result = await this.db.transaction(async () => {
                return await callback(this);
            })();
            
            this.inTransaction = false;
            return result;
        } catch (error) {
            this.inTransaction = false;
            throw new DatabaseError(`Transaction failed: ${error}`, 'TRANSACTION_ERROR');
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
            const result = await this.query<{ name: string }>(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                [tableName]
            );
            return result.length > 0;
        } catch (error) {
            throw new DatabaseError(`Failed to check table existence: ${error}`, 'QUERY_ERROR');
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
            const columnDefs = columns.map(column => {
                let def = `${column.name} ${this.mapColumnType(column.type)}`;
                
                if (column.primaryKey) {
                    def += ' PRIMARY KEY';
                    // Add AUTOINCREMENT for integer primary keys
                    if (column.type.toLowerCase() === 'integer' || column.type.toLowerCase() === 'int') {
                        def += ' AUTOINCREMENT';
                    }
                }
                
                if (column.notNull) {
                    def += ' NOT NULL';
                }
                
                if (column.unique) {
                    def += ' UNIQUE';
                }
                
                if (column.default !== undefined) {
                    if (typeof column.default === 'string') {
                        def += ` DEFAULT '${column.default}'`;
                    } else if (column.default === null) {
                        def += ' DEFAULT NULL';
                    } else {
                        def += ` DEFAULT ${column.default}`;
                    }
                }
                
                return def;
            });

            // Add foreign key constraints
            const foreignKeys = columns
                .filter(col => col.references)
                .map(col => {
                    let fk = `FOREIGN KEY (${col.name}) REFERENCES ${col.references!.table}(${col.references!.column})`;
                    if (col.references!.onDelete) {
                        fk += ` ON DELETE ${col.references!.onDelete}`;
                    }
                    return fk;
                });

            const allConstraints = [...columnDefs, ...foreignKeys];
            const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${allConstraints.join(', ')})`;
            
            await this.execute(sql);
        } catch (error) {
            throw new DatabaseError(`Failed to create table: ${error}`, 'EXECUTE_ERROR');
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
            const columns = await this.query<{
                cid: number;
                name: string;
                type: string;
                notnull: number;
                dflt_value: any;
                pk: number;
            }>(`PRAGMA table_info(${tableName})`);

            return columns.map(col => ({
                name: col.name,
                type: col.type,
                primaryKey: col.pk === 1,
                notNull: col.notnull === 1,
                default: col.dflt_value
            }));
        } catch (error) {
            throw new DatabaseError(`Failed to get table columns: ${error}`, 'QUERY_ERROR');
        }
    }

    /**
     * Select records with tenant-aware filtering
     */
    async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Build WHERE clause
            const whereClauses: string[] = [];
            const params: any[] = [];
            
            // Add tenant filter if tenantId is provided
            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }

            // Add other filters
            filters.forEach(filter => {
                const { sql: filterSql, params: filterParams } = this.buildFilterClause(filter);
                whereClauses.push(filterSql);
                params.push(...filterParams);
            });

            // Build query
            let sql = `SELECT * FROM ${table}`;
            if (whereClauses.length > 0) {
                sql += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            // Add ORDER BY
            if (options.orderBy && options.orderBy.length > 0) {
                const orderClauses = options.orderBy.map(order => 
                    `${order.field} ${order.direction}`
                );
                sql += ` ORDER BY ${orderClauses.join(', ')}`;
            }

            // Add LIMIT and OFFSET
            if (options.limit) {
                sql += ` LIMIT ${options.limit}`;
            }
            if (options.offset) {
                sql += ` OFFSET ${options.offset}`;
            }

            return await this.query(sql, params);
        } catch (error) {
            throw new DatabaseError(`Select failed: ${error}`, 'QUERY_ERROR');
        }
    }

    /**
     * Insert a record with tenant context
     */
    async insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Add tenant_id if provided
            const insertData = { ...data };
            if (tenantId && tenantId !== 'default') {
                insertData.tenant_id = tenantId;
            }

            const fields = Object.keys(insertData);
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(field => insertData[field]);

            const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
            const result = await this.execute(sql, values);

            // Return the inserted record
            if (result.lastInsertId) {
                const [record] = await this.query(
                    `SELECT * FROM ${table} WHERE rowid = ?`,
                    [result.lastInsertId]
                );
                return record;
            }

            return insertData;
        } catch (error) {
            throw new DatabaseError(`Insert failed: ${error}`, 'EXECUTE_ERROR');
        }
    }

    /**
     * Update a record with tenant context
     */
    async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const setClauses: string[] = [];
            const params: any[] = [];

            // Build SET clauses
            Object.entries(data).forEach(([field, value]) => {
                setClauses.push(`${field} = ?`);
                params.push(value);
            });

            // Build WHERE clause
            const whereClauses = ['id = ?'];
            params.push(id);

            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }

            const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
            const result = await this.execute(sql, params);

            // Return the updated record
            if (result.changes > 0) {
                const [record] = await this.query(
                    `SELECT * FROM ${table} WHERE id = ?`,
                    [id]
                );
                return record;
            }
            return null;
        } catch (error) {
            throw new DatabaseError(`Update failed: ${error}`, 'EXECUTE_ERROR');
        }
    }

    /**
     * Delete a record with tenant context
     */
    async delete(table: string, id: string, tenantId: string): Promise<void> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const whereClauses = ['id = ?'];
            const params: any[] = [id];

            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }

            const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
            await this.execute(sql, params);
        } catch (error) {
            throw new DatabaseError(`Delete failed: ${error}`, 'EXECUTE_ERROR');
        }
    }

    /**
     * Count records with tenant-aware filtering
     */
    async count(table: string, filters: QueryFilter[], tenantId: string): Promise<number> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Build WHERE clause
            const whereClauses: string[] = [];
            const params: any[] = [];
            
            // Add tenant filter if tenantId is provided
            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }

            // Add other filters
            filters.forEach(filter => {
                const { sql: filterSql, params: filterParams } = this.buildFilterClause(filter);
                whereClauses.push(filterSql);
                params.push(...filterParams);
            });

            // Build query
            let sql = `SELECT COUNT(*) as count FROM ${table}`;
            if (whereClauses.length > 0) {
                sql += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            const result = await this.query<{ count: number }>(sql, params);
            return result[0]?.count || 0;
        } catch (error) {
            throw new DatabaseError(`Count failed: ${error}`, 'QUERY_ERROR');
        }
    }

    /**
     * Find a record by ID with tenant context
     */
    async findById(table: string, id: string, tenantId: string): Promise<any | null> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const whereClauses = ['id = ?'];
            const params: any[] = [id];

            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }

            const sql = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
            const results = await this.query(sql, params);
            
            return results[0] || null;
        } catch (error) {
            throw new DatabaseError(`FindById failed: ${error}`, 'QUERY_ERROR');
        }
    }

    /**
     * Create a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    async createSchema(schemaName: string): Promise<void> {
        // SQLite doesn't support schemas, tables are prefixed instead
        // This is a no-op for SQLite
        return Promise.resolve();
    }

    /**
     * Drop a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    async dropSchema(schemaName: string): Promise<void> {
        // SQLite doesn't support schemas
        // Would need to drop all tables with the schema prefix
        return Promise.resolve();
    }

    /**
     * List all database schemas (SQLite doesn't support schemas)
     */
    async listSchemas(): Promise<string[]> {
        // SQLite doesn't support schemas
        // Return empty array
        return Promise.resolve([]);
    }

    /**
     * Map generic column types to SQLite types
     */
    private mapColumnType(type: string): string {
        const typeMap: Record<string, string> = {
            'string': 'TEXT',
            'text': 'TEXT',
            'varchar': 'TEXT',
            'char': 'TEXT',
            'int': 'INTEGER',
            'integer': 'INTEGER',
            'bigint': 'INTEGER',
            'smallint': 'INTEGER',
            'tinyint': 'INTEGER',
            'float': 'REAL',
            'double': 'REAL',
            'decimal': 'REAL',
            'numeric': 'REAL',
            'real': 'REAL',
            'boolean': 'INTEGER',
            'bool': 'INTEGER',
            'date': 'TEXT',
            'datetime': 'TEXT',
            'timestamp': 'TEXT',
            'time': 'TEXT',
            'json': 'TEXT',
            'jsonb': 'TEXT',
            'blob': 'BLOB',
            'binary': 'BLOB'
        };

        return typeMap[type.toLowerCase()] || 'TEXT';
    }

    /**
     * Build filter clause for a QueryFilter
     */
    private buildFilterClause(filter: QueryFilter): { sql: string; params: any[] } {
        const { field, value, operator = 'eq' } = filter;
        
        switch (operator) {
            case 'eq':
                return { sql: `${field} = ?`, params: [value] };
            case 'neq':
                return { sql: `${field} != ?`, params: [value] };
            case 'gt':
                return { sql: `${field} > ?`, params: [value] };
            case 'lt':
                return { sql: `${field} < ?`, params: [value] };
            case 'gte':
                return { sql: `${field} >= ?`, params: [value] };
            case 'lte':
                return { sql: `${field} <= ?`, params: [value] };
            case 'like':
                return { sql: `${field} LIKE ?`, params: [value] };
            case 'contains':
                return { sql: `${field} LIKE ?`, params: [`%${value}%`] };
            case 'startswith':
                return { sql: `${field} LIKE ?`, params: [`${value}%`] };
            case 'endswith':
                return { sql: `${field} LIKE ?`, params: [`%${value}`] };
            case 'in':
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => '?').join(', ');
                    return { sql: `${field} IN (${placeholders})`, params: value };
                }
                return { sql: `${field} = ?`, params: [value] };
            case 'nin':
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => '?').join(', ');
                    return { sql: `${field} NOT IN (${placeholders})`, params: value };
                }
                return { sql: `${field} != ?`, params: [value] };
            default:
                throw new DatabaseError(`Unsupported operator: ${operator}`, 'QUERY_ERROR');
        }
    }
}

/**
 * Factory function to create SQLite adapter
 */
export function createSQLiteAdapter(config?: DatabaseAdapterConfig): SQLiteAdapter {
    return new SQLiteAdapter(config);
}
