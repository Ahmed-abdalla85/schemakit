"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteAdapter = void 0;
exports.createSQLiteAdapter = createSQLiteAdapter;
/**
 * SQLite database adapter implementation
 * Supports better-sqlite3 when available, falls back to in-memory mock for zero-dependency
 */
const adapter_1 = require("../adapter");
const errors_1 = require("../../errors");
// Removed processFilterValue import as it's not needed
/**
 * SQLite adapter implementation
 * Uses better-sqlite3 when available, with fallback to in-memory implementation
 */
class SQLiteAdapter extends adapter_1.DatabaseAdapter {
    constructor(config = {}) {
        super(config);
        this.db = null;
        this.connected = false;
        this.inTransaction = false;
        this.Database = null;
        // Default SQLite database to in-memory if not specified
        this.config.filename = this.config.filename || ':memory:';
    }
    /**
     * Connect to SQLite database
     */
    async connect() {
        if (this.connected)
            return;
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
            }
            catch (error) {
                // If better-sqlite3 is not available, throw an error
                throw new errors_1.DatabaseError('SQLite adapter requires better-sqlite3. Please install it: npm install better-sqlite3', 'CONNECTION_ERROR');
            }
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to connect to SQLite: ${error}`, 'CONNECTION_ERROR');
        }
    }
    /**
     * Disconnect from SQLite database
     */
    async disconnect() {
        if (!this.connected)
            return;
        try {
            if (this.db && this.db.close) {
                this.db.close();
            }
            this.db = null;
            this.connected = false;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to disconnect from SQLite: ${error}`, 'CONNECTION_ERROR');
        }
    }
    /**
     * Check if connected to the database
     */
    isConnected() {
        return this.connected && this.db !== null;
    }
    /**
     * Execute a query that returns rows
     */
    async query(sql, params) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const stmt = this.db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            return result;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Query failed: ${error}\nSQL: ${sql}`, 'QUERY_ERROR');
        }
    }
    /**
     * Execute a query that doesn't return rows
     */
    async execute(sql, params) {
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
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Execute failed: ${error}\nSQL: ${sql}`, 'EXECUTE_ERROR');
        }
    }
    /**
     * Execute a function within a transaction
     */
    async transaction(callback) {
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
        }
        catch (error) {
            this.inTransaction = false;
            throw new errors_1.DatabaseError(`Transaction failed: ${error}`, 'TRANSACTION_ERROR');
        }
    }
    /**
     * Check if a table exists
     */
    async tableExists(tableName) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const result = await this.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
            return result.length > 0;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to check table existence: ${error}`, 'QUERY_ERROR');
        }
    }
    /**
     * Create a new table
     */
    async createTable(tableName, columns) {
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
                    }
                    else if (column.default === null) {
                        def += ' DEFAULT NULL';
                    }
                    else {
                        def += ` DEFAULT ${column.default}`;
                    }
                }
                return def;
            });
            // Add foreign key constraints
            const foreignKeys = columns
                .filter(col => col.references)
                .map(col => {
                let fk = `FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column})`;
                if (col.references.onDelete) {
                    fk += ` ON DELETE ${col.references.onDelete}`;
                }
                return fk;
            });
            const allConstraints = [...columnDefs, ...foreignKeys];
            const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${allConstraints.join(', ')})`;
            await this.execute(sql);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to create table: ${error}`, 'EXECUTE_ERROR');
        }
    }
    /**
     * Get column information for a table
     */
    async getTableColumns(tableName) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const columns = await this.query(`PRAGMA table_info(${tableName})`);
            return columns.map(col => ({
                name: col.name,
                type: col.type,
                primaryKey: col.pk === 1,
                notNull: col.notnull === 1,
                default: col.dflt_value
            }));
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get table columns: ${error}`, 'QUERY_ERROR');
        }
    }
    /**
     * Select records with tenant-aware filtering
     */
    async select(table, filters, options, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // Build WHERE clause
            const whereClauses = [];
            const params = [];
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
                const orderClauses = options.orderBy.map(order => `${order.field} ${order.direction}`);
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
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Select failed: ${error}`, 'QUERY_ERROR');
        }
    }
    /**
     * Insert a record with tenant context
     */
    async insert(table, data, tenantId) {
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
                const [record] = await this.query(`SELECT * FROM ${table} WHERE rowid = ?`, [result.lastInsertId]);
                return record;
            }
            return insertData;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Insert failed: ${error}`, 'EXECUTE_ERROR');
        }
    }
    /**
     * Update a record with tenant context
     */
    async update(table, id, data, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const setClauses = [];
            const params = [];
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
                const [record] = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
                return record;
            }
            return null;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Update failed: ${error}`, 'EXECUTE_ERROR');
        }
    }
    /**
     * Delete a record with tenant context
     */
    async delete(table, id, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const whereClauses = ['id = ?'];
            const params = [id];
            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }
            const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
            await this.execute(sql, params);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Delete failed: ${error}`, 'EXECUTE_ERROR');
        }
    }
    /**
     * Count records with tenant-aware filtering
     */
    async count(table, filters, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // Build WHERE clause
            const whereClauses = [];
            const params = [];
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
            const result = await this.query(sql, params);
            return result[0]?.count || 0;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Count failed: ${error}`, 'QUERY_ERROR');
        }
    }
    /**
     * Find a record by ID with tenant context
     */
    async findById(table, id, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const whereClauses = ['id = ?'];
            const params = [id];
            if (tenantId && tenantId !== 'default') {
                whereClauses.push('tenant_id = ?');
                params.push(tenantId);
            }
            const sql = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
            const results = await this.query(sql, params);
            return results[0] || null;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`FindById failed: ${error}`, 'QUERY_ERROR');
        }
    }
    /**
     * Create a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    async createSchema(schemaName) {
        // SQLite doesn't support schemas, tables are prefixed instead
        // This is a no-op for SQLite
        return Promise.resolve();
    }
    /**
     * Drop a database schema (SQLite doesn't support schemas, so this is a no-op)
     */
    async dropSchema(schemaName) {
        // SQLite doesn't support schemas
        // Would need to drop all tables with the schema prefix
        return Promise.resolve();
    }
    /**
     * List all database schemas (SQLite doesn't support schemas)
     */
    async listSchemas() {
        // SQLite doesn't support schemas
        // Return empty array
        return Promise.resolve([]);
    }
    /**
     * Map generic column types to SQLite types
     */
    mapColumnType(type) {
        const typeMap = {
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
    buildFilterClause(filter) {
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
                throw new errors_1.DatabaseError(`Unsupported operator: ${operator}`, 'QUERY_ERROR');
        }
    }
}
exports.SQLiteAdapter = SQLiteAdapter;
/**
 * Factory function to create SQLite adapter
 */
function createSQLiteAdapter(config) {
    return new SQLiteAdapter(config);
}
//# sourceMappingURL=sqlite.js.map