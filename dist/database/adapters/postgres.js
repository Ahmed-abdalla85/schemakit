/**
 * PostgreSQL database adapter implementation
 */
import { DatabaseAdapter } from '../adapter';
import { DatabaseError } from '../../errors';
import { processFilterValue } from '../../utils/query-helpers';
import { QueryManager } from '../query-manager';
/**
 * PostgreSQL adapter implementation
 * Uses native PostgreSQL implementation with no external dependencies
 */
export class PostgresAdapter extends DatabaseAdapter {
    constructor(config = {}) {
        super(config);
        this.client = null;
        this.connected = false;
        this.queryManager = null; // Will be initialized with QueryManager
        // Set default PostgreSQL connection options
        this.config.host = this.config.host || 'localhost';
        this.config.port = this.config.port || 5432;
        this.config.database = this.config.database || 'postgres';
        // Initialize QueryManager (will be properly initialized after connection)
        this.queryManager = new QueryManager(this);
    }
    /**
     * Connect to PostgreSQL database
     */
    async connect() {
        if (this.connected)
            return;
        try {
            // We'll implement a minimal PostgreSQL interface
            // This is a placeholder for the actual implementation
            this.client = {
                // Placeholder for PostgreSQL client connection
                query: async (sql, params = []) => {
                    // Implementation will be added
                    console.log(`Executing SQL: ${sql} with params: ${JSON.stringify(params)}`);
                    return { rows: [], rowCount: 0 };
                }
            };
            this.connected = true;
        }
        catch (error) {
            throw new DatabaseError('connect', error);
        }
    }
    /**
     * Disconnect from PostgreSQL database
     */
    async disconnect() {
        if (!this.connected)
            return;
        try {
            // Close the database connection
            this.client = null;
            this.connected = false;
        }
        catch (error) {
            throw new DatabaseError('disconnect', error);
        }
    }
    /**
     * Check if connected to PostgreSQL database
     */
    isConnected() {
        return this.connected && this.client !== null;
    }
    /**
     * Execute a query that returns rows
     */
    async query(sql, params = []) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const result = await this.client.query(sql, params);
            return result.rows;
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
            const result = await this.client.query(sql, params);
            return {
                changes: result.rowCount,
                lastInsertId: result.rows?.[0]?.id
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
            await this.execute('BEGIN');
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
            const schema = 'public'; // Default schema
            const result = await this.query(`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )`, [schema, tableName]);
            return result[0]?.exists || false;
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
            const schema = 'public'; // Default schema
            const columns = await this.query(`
        SELECT 
          c.column_name, 
          c.data_type, 
          c.is_nullable,
          c.column_default,
          tc.constraint_type
        FROM 
          information_schema.columns c
        LEFT JOIN 
          information_schema.constraint_column_usage ccu ON c.column_name = ccu.column_name AND c.table_name = ccu.table_name
        LEFT JOIN 
          information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
        WHERE 
          c.table_schema = $1 AND c.table_name = $2
      `, [schema, tableName]);
            return columns.map(col => ({
                name: col.column_name,
                type: col.data_type,
                primaryKey: col.constraint_type === 'PRIMARY KEY',
                notNull: col.is_nullable === 'NO',
                default: col.column_default
            }));
        }
        catch (error) {
            throw new DatabaseError('getTableColumns', error);
        }
    }
    // ===== EntityKit-style multi-tenant methods =====
    /**
     * Select records with tenant-aware filtering (EntityKit pattern)
     */
    async select(table, filters, options, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // Process filter values for special operators
            const processedFilters = filters.map(filter => ({
                ...filter,
                value: processFilterValue(filter.operator || 'eq', filter.value)
            }));
            const { sql, params } = this.queryManager.buildSelectQuery(table, tenantId, processedFilters, options);
            const result = await this.client.query(sql, params);
            return result.rows;
        }
        catch (error) {
            throw new DatabaseError('select', error);
        }
    }
    /**
     * Insert a record with tenant context (EntityKit pattern)
     */
    async insert(table, data, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            if (tenantId) {
                const { sql, params } = this.queryManager.buildInsertQuery(table, tenantId, data);
                const result = await this.client.query(sql, params);
                return result.rows[0];
            }
            else {
                // Fallback to non-tenant insert for backward compatibility
                const keys = Object.keys(data);
                const values = Object.values(data);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
                const result = await this.client.query(query, values);
                return result.rows[0];
            }
        }
        catch (error) {
            throw new DatabaseError('insert', error);
        }
    }
    /**
     * Update a record with tenant context (EntityKit pattern)
     */
    async update(table, id, data, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildUpdateQuery(table, tenantId, id, data);
            const result = await this.client.query(sql, params);
            return result.rows[0];
        }
        catch (error) {
            throw new DatabaseError('update', error);
        }
    }
    /**
     * Delete a record with tenant context (EntityKit pattern)
     */
    async delete(table, id, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildDeleteQuery(table, tenantId, id);
            await this.client.query(sql, params);
        }
        catch (error) {
            throw new DatabaseError('delete', error);
        }
    }
    /**
     * Count records with tenant-aware filtering (EntityKit pattern)
     */
    async count(table, filters, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            // Process filter values for special operators
            const processedFilters = filters.map(filter => ({
                ...filter,
                value: processFilterValue(filter.operator || 'eq', filter.value)
            }));
            const { sql, params } = this.queryManager.buildCountQuery(table, tenantId, processedFilters);
            const result = await this.client.query(sql, params);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            throw new DatabaseError('count', error);
        }
    }
    /**
     * Find a record by ID with tenant context (EntityKit pattern)
     */
    async findById(table, id, tenantId) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildFindByIdQuery(table, tenantId, id);
            const result = await this.client.query(sql, params);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError('findById', error);
        }
    }
    // ===== Schema management methods =====
    /**
     * Create a database schema (for multi-tenancy)
     */
    async createSchema(schemaName) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildCreateSchemaQuery(schemaName);
            await this.client.query(sql, params);
        }
        catch (error) {
            throw new DatabaseError('createSchema', error);
        }
    }
    /**
     * Drop a database schema
     */
    async dropSchema(schemaName) {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildDropSchemaQuery(schemaName);
            await this.client.query(sql, params);
        }
        catch (error) {
            throw new DatabaseError('dropSchema', error);
        }
    }
    /**
     * List all database schemas
     */
    async listSchemas() {
        if (!this.isConnected()) {
            await this.connect();
        }
        try {
            const { sql, params } = this.queryManager.buildListSchemasQuery();
            const result = await this.client.query(sql, params);
            return result.rows.map((row) => row.schema_name);
        }
        catch (error) {
            throw new DatabaseError('listSchemas', error);
        }
    }
}
//# sourceMappingURL=postgres.js.map