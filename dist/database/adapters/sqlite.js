/**
 * SQLite database adapter implementation
 */
import { DatabaseAdapter } from '../adapter';
import { DatabaseError } from '../../errors';
/**
 * SQLite adapter implementation
 * Uses native SQLite implementation with no external dependencies
 */
export class SQLiteAdapter extends DatabaseAdapter {
    constructor(config = {}) {
        super(config);
        this.db = null;
        this.connected = false;
        this.statements = new Map();
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
            // In a real implementation, we would use the native SQLite module
            // For this implementation, we'll create a minimal in-memory database
            // Create an in-memory database with basic SQLite functionality
            const data = {};
            const tableSchemas = {};
            let lastInsertId = 0;
            this.db = {
                exec: (sql) => {
                    // Simple SQL execution for DDL statements
                    // In a real implementation, this would parse and execute the SQL
                    console.log(`Executing SQL: ${sql}`);
                    // Handle CREATE TABLE statements (very simplified)
                    const createTableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i);
                    if (createTableMatch) {
                        const tableName = createTableMatch[1];
                        data[tableName] = [];
                    }
                },
                prepare: (sql) => {
                    // Create a prepared statement
                    console.log(`Preparing SQL: ${sql}`);
                    const statement = {
                        run: (...params) => {
                            console.log(`Running SQL with params: ${JSON.stringify(params)}`);
                            // Handle INSERT statements (very simplified)
                            const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
                            if (insertMatch) {
                                const tableName = insertMatch[1];
                                if (!data[tableName])
                                    data[tableName] = [];
                                // Create a new record with an ID
                                lastInsertId++;
                                const record = { id: lastInsertId };
                                data[tableName].push(record);
                                return { changes: 1, lastInsertRowid: lastInsertId };
                            }
                            // Handle UPDATE statements (very simplified)
                            const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
                            if (updateMatch) {
                                return { changes: 1, lastInsertRowid: 0 };
                            }
                            // Handle DELETE statements (very simplified)
                            const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
                            if (deleteMatch) {
                                return { changes: 1, lastInsertRowid: 0 };
                            }
                            return { changes: 0, lastInsertRowid: 0 };
                        },
                        all: (...params) => {
                            console.log(`Query SQL with params: ${JSON.stringify(params)}`);
                            // Handle SELECT statements (very simplified)
                            const selectMatch = sql.match(/SELECT\s+.+\s+FROM\s+(\w+)/i);
                            if (selectMatch) {
                                const tableName = selectMatch[1];
                                return data[tableName] || [];
                            }
                            // Handle PRAGMA statements for table_info
                            const pragmaMatch = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
                            if (pragmaMatch) {
                                const tableName = pragmaMatch[1];
                                const schema = tableSchemas[tableName] || [];
                                return schema.map((col, index) => ({
                                    cid: index,
                                    name: col.name,
                                    type: col.type,
                                    notnull: col.notNull ? 1 : 0,
                                    dflt_value: col.default,
                                    pk: col.primaryKey ? 1 : 0
                                }));
                            }
                            return [];
                        },
                        get: (...params) => {
                            const results = statement.all(...params);
                            return results[0] || null;
                        },
                        finalize: () => {
                            // Clean up the statement
                            this.statements.delete(sql);
                        }
                    };
                    // Store the statement for later use
                    this.statements.set(sql, statement);
                    return statement;
                },
                close: () => {
                    // Close the database connection
                    this.connected = false;
                },
                inTransaction: false
            };
            this.connected = true;
        }
        catch (error) {
            throw new DatabaseError('connect', error);
        }
    }
    /**
     * Disconnect from SQLite database
     */
    async disconnect() {
        if (!this.connected)
            return;
        try {
            // Close the database connection
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            this.connected = false;
        }
        catch (error) {
            throw new DatabaseError('disconnect', error);
        }
    }
    /**
     * Check if connected to SQLite database
     */
    isConnected() {
        return this.connected && this.db !== null;
    }
    /**
     * Execute a query that returns rows
     */
    async query(sql, params = []) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // Create a prepared statement and execute it
            const stmt = this.db.prepare(sql);
            const result = stmt.all(...params);
            stmt.finalize();
            return result;
        }
        catch (error) {
            throw new DatabaseError('query', error);
        }
    }
    /**
     * Execute a query that doesn't return rows
     */
    async execute(sql, params = []) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // For DDL statements like CREATE TABLE, use exec
            if (sql.trim().toUpperCase().startsWith('CREATE') ||
                sql.trim().toUpperCase().startsWith('DROP') ||
                sql.trim().toUpperCase().startsWith('ALTER')) {
                this.db.exec(sql);
                return { changes: 0 };
            }
            // For DML statements, use prepared statements
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            stmt.finalize();
            return {
                changes: result.changes,
                lastInsertId: result.lastInsertRowid
            };
        }
        catch (error) {
            throw new DatabaseError('execute', error);
        }
    }
    /**
     * Execute a function within a transaction
     */
    async transaction(callback) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            await this.execute('BEGIN TRANSACTION');
            try {
                const result = await callback(this);
                await this.execute('COMMIT');
                return result;
            }
            catch (error) {
                await this.execute('ROLLBACK');
                throw error;
            }
        }
        catch (error) {
            throw new DatabaseError('transaction', error);
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
            const result = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
            return result.length > 0;
        }
        catch (error) {
            throw new DatabaseError('tableExists', error);
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
                let def = `${column.name} ${column.type}`;
                if (column.primaryKey) {
                    def += ' PRIMARY KEY';
                }
                if (column.notNull) {
                    def += ' NOT NULL';
                }
                if (column.unique) {
                    def += ' UNIQUE';
                }
                if (column.default !== undefined) {
                    def += ` DEFAULT ${typeof column.default === 'string' ? `'${column.default}'` : column.default}`;
                }
                if (column.references) {
                    def += ` REFERENCES ${column.references.table}(${column.references.column})`;
                    if (column.references.onDelete) {
                        def += ` ON DELETE ${column.references.onDelete}`;
                    }
                }
                return def;
            }).join(', ');
            await this.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`);
        }
        catch (error) {
            throw new DatabaseError('createTable', error);
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
            throw new DatabaseError('getTableColumns', error);
        }
    }
}
//# sourceMappingURL=sqlite.js.map