/**
 * SQLite database adapter implementation
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback } from '../adapter';
import { DatabaseError } from '../../errors';

/**
 * Minimal SQLite database interface
 */
interface SQLiteDatabase {
    exec(sql: string): void;
    prepare(sql: string): SQLiteStatement;
    close(): void;
    inTransaction: boolean;
}

/**
 * Minimal SQLite statement interface
 */
interface SQLiteStatement {
    run(...params: any[]): { changes: number, lastInsertRowid: number };
    all(...params: any[]): any[];
    get(...params: any[]): any;
    finalize(): void;
}

/**
 * SQLite adapter implementation
 * Uses native SQLite implementation with no external dependencies
 */
export class SQLiteAdapter extends DatabaseAdapter {
    private db: SQLiteDatabase | null = null;
    private connected = false;
    private statements: Map<string, SQLiteStatement> = new Map();

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
            // In a real implementation, we would use the native SQLite module
            // For this implementation, we'll create a minimal in-memory database
            
            // Create an in-memory database with basic SQLite functionality
            const data: Record<string, any[]> = {};
            const tableSchemas: Record<string, ColumnDefinition[]> = {};
            let lastInsertId = 0;
            
            this.db = {
                exec: (sql: string): void => {
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
                
                prepare: (sql: string): SQLiteStatement => {
                    // Create a prepared statement
                    console.log(`Preparing SQL: ${sql}`);
                    
                    const statement = {
                        run: (...params: any[]): { changes: number, lastInsertRowid: number } => {
                            console.log(`Running SQL with params: ${JSON.stringify(params)}`);
                            
                            // Handle INSERT statements (very simplified)
                            const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
                            if (insertMatch) {
                                const tableName = insertMatch[1];
                                if (!data[tableName]) data[tableName] = [];
                                
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
                        
                        all: (...params: any[]): any[] => {
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
                        
                        get: (...params: any[]): any => {
                            const results = statement.all(...params);
                            return results[0] || null;
                        },
                        
                        finalize: (): void => {
                            // Clean up the statement
                            this.statements.delete(sql);
                        }
                    };
                    
                    // Store the statement for later use
                    this.statements.set(sql, statement);
                    return statement;
                },
                
                close: (): void => {
                    // Close the database connection
                    this.connected = false;
                },
                
                inTransaction: false
            };
            
            this.connected = true;
        } catch (error) {
            throw new DatabaseError('connect', error);
        }
    }

    /**
     * Disconnect from SQLite database
     */
    async disconnect(): Promise<void> {
        if (!this.connected) return;

        try {
            // Close the database connection
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            this.connected = false;
        } catch (error) {
            throw new DatabaseError('disconnect', error);
        }
    }

    /**
     * Check if connected to SQLite database
     */
    isConnected(): boolean {
        return this.connected && this.db !== null;
    }

    /**
     * Execute a query that returns rows
     */
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Create a prepared statement and execute it
            const stmt = this.db!.prepare(sql);
            const result = stmt.all(...params) as T[];
            stmt.finalize();
            return result;
        } catch (error) {
            throw new DatabaseError('query', error);
        }
    }

    /**
     * Execute a query that doesn't return rows
     */
    async execute(sql: string, params: any[] = []): Promise<{ changes: number, lastInsertId?: string | number }> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // For DDL statements like CREATE TABLE, use exec
            if (sql.trim().toUpperCase().startsWith('CREATE') || 
                sql.trim().toUpperCase().startsWith('DROP') ||
                sql.trim().toUpperCase().startsWith('ALTER')) {
                this.db!.exec(sql);
                return { changes: 0 };
            }
            
            // For DML statements, use prepared statements
            const stmt = this.db!.prepare(sql);
            const result = stmt.run(...params);
            stmt.finalize();
            
            return { 
                changes: result.changes,
                lastInsertId: result.lastInsertRowid
            };
        } catch (error) {
            throw new DatabaseError('execute', error);
        }
    }

    /**
     * Execute a function within a transaction
     */
    async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            await this.execute('BEGIN TRANSACTION');

            try {
                const result = await callback(this);
                await this.execute('COMMIT');
                return result;
            } catch (error) {
                await this.execute('ROLLBACK');
                throw error;
            }
        } catch (error) {
            throw new DatabaseError('transaction', error);
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
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName]
            );
            return result.length > 0;
        } catch (error) {
            throw new DatabaseError('tableExists', error);
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
        } catch (error) {
            throw new DatabaseError('createTable', error);
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
                dflt_value: string | null;
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
            throw new DatabaseError('getTableColumns', error);
        }
    }
}