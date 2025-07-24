/**
 * In-Memory database adapter implementation for testing
 * Follows EntityKit's proven in-memory adapter pattern
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from '../adapter';
import { DatabaseError } from '../../errors';
import { processFilterValue } from '../../utils/query-helpers';
import { generateSequentialId } from '../../utils/id-generation';
import { parseValue, getCurrentTimestamp } from '../../utils/date-helpers';

/**
 * In-Memory adapter implementation for testing
 * Provides full CRUD operations without external dependencies
 */
export class InMemoryAdapter extends DatabaseAdapter {
    private tenantData: Map<string, Map<string, any[]>> = new Map(); // tenantId -> tableName -> records[]
    private tenantSchemas: Set<string> = new Set();
    private connected = false;
    private lastInsertIds: Map<string, number> = new Map(); // tableName -> lastId

    constructor(config: DatabaseAdapterConfig = {}) {
        super(config);
    }

    /**
     * Connect to in-memory database (always succeeds)
     */
    async connect(): Promise<void> {
        this.connected = true;
    }

    /**
     * Disconnect from in-memory database
     */
    async disconnect(): Promise<void> {
        this.connected = false;
        // Optionally clear data on disconnect
        if (this.config?.clearOnDisconnect) {
            this.tenantData.clear();
            this.tenantSchemas.clear();
            this.lastInsertIds.clear();
        }
    }

    /**
     * Check if connected to in-memory database
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Execute a query that returns rows (simplified for in-memory)
     */
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Simple query parsing for in-memory operations
            console.log(`In-Memory Query: ${sql} with params: ${JSON.stringify(params)}`);
            
            // Handle SELECT queries
            const selectMatch = sql.match(/SELECT\s+(.+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
            if (selectMatch) {
                const tableName = selectMatch[2];
                const whereClause = selectMatch[3];
                const tenant = this.extractTenantFromTable(tableName);
                const actualTable = this.extractActualTableName(tableName);
                
                let records = this.getTableData(tenant, actualTable);
                
                // Apply WHERE conditions if present
                if (whereClause && params.length > 0) {
                    records = records.filter(record => {
                        // Simple WHERE clause parsing for common patterns
                        if (whereClause.includes('name = ?') && whereClause.includes('is_active = ?')) {
                            const nameValue = params[0];
                            const isActiveValue = params[1];
                            return record.name === nameValue && record.is_active === isActiveValue;
                        }
                        if (whereClause.includes('entity_id = ?') && whereClause.includes('is_active = ?')) {
                            const entityIdValue = params[0];
                            const isActiveValue = params[1];
                            return record.entity_id === entityIdValue && record.is_active === isActiveValue;
                        }
                        if (whereClause.includes('entity_id = ?') && whereClause.includes('role IN (?)') && whereClause.includes('is_active = ?')) {
                            const entityIdValue = params[0];
                            const roleValue = params[1];
                            const isActiveValue = params[2];
                            return record.entity_id === entityIdValue && record.role === roleValue && record.is_active === isActiveValue;
                        }
                        if (whereClause.includes('entity_id = ?')) {
                            const entityIdValue = params[0];
                            return record.entity_id === entityIdValue;
                        }
                        if (whereClause.includes('id = ?')) {
                            const idValue = params[0];
                            return record.id === idValue;
                        }
                        // Default: return all records if we can't parse the WHERE clause
                        return true;
                    });
                }
                
                return records as T[];
            }

            // Handle COUNT queries
            const countMatch = sql.match(/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i);
            if (countMatch) {
                const tableName = countMatch[1];
                const tenant = this.extractTenantFromTable(tableName);
                const actualTable = this.extractActualTableName(tableName);
                
                const records = this.getTableData(tenant, actualTable);
                return [{ count: records.length }] as T[];
            }

            return [];
        } catch (error) {
            throw new DatabaseError('query', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { sql, params }
            });
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
            console.log(`In-Memory Execute: ${sql} with params: ${JSON.stringify(params)}`);
            
            // Handle CREATE TABLE
            const createTableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
            if (createTableMatch) {
                const tableName = createTableMatch[1];
                const tenant = this.extractTenantFromTable(tableName);
                const actualTable = this.extractActualTableName(tableName);
                
                this.ensureTableExists(tenant, actualTable);
                return { changes: 0 };
            }

            // Handle CREATE SCHEMA
            const createSchemaMatch = sql.match(/CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
            if (createSchemaMatch) {
                const schemaName = createSchemaMatch[1];
                this.tenantSchemas.add(schemaName);
                return { changes: 0 };
            }

            // Handle DROP SCHEMA
            const dropSchemaMatch = sql.match(/DROP\s+SCHEMA\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
            if (dropSchemaMatch) {
                const schemaName = dropSchemaMatch[1];
                this.tenantSchemas.delete(schemaName);
                this.tenantData.delete(schemaName);
                return { changes: 1 };
            }

            // Handle INSERT statements (including multi-row inserts)
            const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*(.+?)(?:\s+RETURNING\s+.+)?$/is);
            if (insertMatch) {
                const tableName = insertMatch[1];
                const columns = insertMatch[2].split(',').map(col => col.trim());
                const valuesSection = insertMatch[3];
                
                const tenant = this.extractTenantFromTable(tableName);
                const actualTable = this.extractActualTableName(tableName);
                
                this.ensureTableExists(tenant, actualTable);
                
                // Check if this is a multi-row insert
                const valueRows = this.parseMultiRowValues(valuesSection);
                let changes = 0;
                let lastInsertId: string | number | undefined;
                
                for (const values of valueRows) {
                    // Create record object
                    const record: Record<string, any> = {};
                    columns.forEach((col, index) => {
                        if (index < values.length) {
                            // Handle parameterized values if params are provided
                            if (params.length > 0 && values[index] === `$${index + 1}`) {
                                record[col] = params[index];
                            } else {
                                record[col] = values[index];
                            }
                        }
                    });
                    
                    // Generate ID if not provided
                    if (!record.id) {
                        record.id = this.generateId(actualTable);
                    }
                    
                    const records = this.getTableData(tenant, actualTable);
                    records.push(record);
                    changes++;
                    lastInsertId = record.id;
                }
                
                return { changes, lastInsertId };
            }

            return { changes: 0 };
        } catch (error) {
            throw new DatabaseError('execute', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { sql, params }
            });
        }
    }

    /**
     * Execute a function within a transaction (simplified for in-memory)
     */
    async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // For in-memory, we don't need real transactions
            // Just execute the callback
            return await callback(this);
        } catch (error) {
            throw new DatabaseError('transaction', { 
                cause: error instanceof Error ? error : new Error(String(error))
            });
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
            const tenant = this.extractTenantFromTable(tableName);
            const actualTable = this.extractActualTableName(tableName);
            
            const tenantTables = this.tenantData.get(tenant);
            return tenantTables?.has(actualTable) || false;
        } catch (error) {
            throw new DatabaseError('table_exists_check', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { tableName }
            });
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
            const tenant = this.extractTenantFromTable(tableName);
            const actualTable = this.extractActualTableName(tableName);
            
            this.ensureTableExists(tenant, actualTable);
        } catch (error) {
            throw new DatabaseError('create_table', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { tableName }
            });
        }
    }

    /**
     * Get column information for a table (simplified for in-memory)
     */
    async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            // Return basic column definitions for in-memory tables
            return [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'created_at', type: 'TEXT', notNull: true },
                { name: 'updated_at', type: 'TEXT', notNull: true }
            ];
        } catch (error) {
            throw new DatabaseError('get_table_columns', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { tableName }
            });
        }
    }

    // ===== EntityKit-style multi-tenant methods =====

    /**
     * Select records with tenant-aware filtering (EntityKit pattern)
     */
    async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            let records = this.getTableData(tenantId, table);

            // Apply filters
            if (filters.length > 0) {
                records = records.filter(record => {
                    return filters.every(filter => {
                        const fieldValue = record[filter.field];
                        const filterValue = processFilterValue(filter.operator || 'eq', filter.value);
                        
                        return this.matchesFilter(fieldValue, filterValue, filter.operator || 'eq');
                    });
                });
            }

            // Apply sorting
            if (options.orderBy && options.orderBy.length > 0) {
                records.sort((a, b) => {
                    for (const sort of options.orderBy!) {
                        const aVal = a[sort.field];
                        const bVal = b[sort.field];
                        
                        if (aVal < bVal) return sort.direction === 'ASC' ? -1 : 1;
                        if (aVal > bVal) return sort.direction === 'ASC' ? 1 : -1;
                    }
                    return 0;
                });
            }

            // Apply pagination
            if (options.offset || options.limit) {
                const start = options.offset || 0;
                const end = options.limit ? start + options.limit : undefined;
                records = records.slice(start, end);
            }

            return records;
        } catch (error) {
            throw new DatabaseError('select', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, filters, options, tenantId }
            });
        }
    }

    /**
     * Insert a record with tenant context (EntityKit pattern)
     */
    async insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const tenant = tenantId || 'default';
            this.ensureTableExists(tenant, table);
            
            // Generate ID if not provided
            const id = data.id || this.generateId(table);
            const now = getCurrentTimestamp();
            
            const record = {
                ...data,
                id,
                created_at: data.created_at || now,
                updated_at: data.updated_at || now
            };

            const records = this.getTableData(tenant, table);
            records.push(record);

            return record;
        } catch (error) {
            throw new DatabaseError('insert', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, data, tenantId }
            });
        }
    }

    /**
     * Update a record with tenant context (EntityKit pattern)
     */
    async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const records = this.getTableData(tenantId, table);
            const recordIndex = records.findIndex(r => r.id === id);
            
            if (recordIndex === -1) {
                throw new Error(`Record with id ${id} not found`);
            }

            // Add a small delay to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1));

            const updatedRecord = {
                ...records[recordIndex],
                ...data,
                id, // Preserve ID
                updated_at: new Date().toISOString()
            };

            records[recordIndex] = updatedRecord;
            return updatedRecord;
        } catch (error) {
            throw new DatabaseError('update', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, id, data, tenantId }
            });
        }
    }

    /**
     * Delete a record with tenant context (EntityKit pattern)
     */
    async delete(table: string, id: string, tenantId: string): Promise<void> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const records = this.getTableData(tenantId, table);
            const recordIndex = records.findIndex(r => r.id === id);
            
            if (recordIndex === -1) {
                throw new Error(`Record with id ${id} not found`);
            }

            records.splice(recordIndex, 1);
        } catch (error) {
            throw new DatabaseError('delete', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, id, tenantId }
            });
        }
    }

    /**
     * Count records with tenant-aware filtering (EntityKit pattern)
     */
    async count(table: string, filters: QueryFilter[], tenantId: string): Promise<number> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            let records = this.getTableData(tenantId, table);

            // Apply filters
            if (filters.length > 0) {
                records = records.filter(record => {
                    return filters.every(filter => {
                        const fieldValue = record[filter.field];
                        const filterValue = processFilterValue(filter.operator || 'eq', filter.value);
                        
                        return this.matchesFilter(fieldValue, filterValue, filter.operator || 'eq');
                    });
                });
            }

            return records.length;
        } catch (error) {
            throw new DatabaseError('count', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, filters, tenantId }
            });
        }
    }

    /**
     * Find a record by ID with tenant context (EntityKit pattern)
     */
    async findById(table: string, id: string, tenantId: string): Promise<any | null> {
        if (!this.isConnected()) {
            await this.connect();
        }

        try {
            const records = this.getTableData(tenantId, table);
            return records.find(r => r.id === id) || null;
        } catch (error) {
            throw new DatabaseError('find_by_id', { 
                cause: error instanceof Error ? error : new Error(String(error)),
                context: { table, id, tenantId }
            });
        }
    }

    // ===== Schema management methods =====

    /**
     * Create a database schema (for multi-tenancy)
     */
    async createSchema(schemaName: string): Promise<void> {
        this.tenantSchemas.add(schemaName);
        if (!this.tenantData.has(schemaName)) {
            this.tenantData.set(schemaName, new Map());
        }
    }

    /**
     * Drop a database schema
     */
    async dropSchema(schemaName: string): Promise<void> {
        this.tenantSchemas.delete(schemaName);
        this.tenantData.delete(schemaName);
    }

    /**
     * List all database schemas
     */
    async listSchemas(): Promise<string[]> {
        return Array.from(this.tenantSchemas).sort();
    }

    // ===== Private helper methods =====

    private ensureTableExists(tenantId: string, tableName: string): void {
        if (!this.tenantData.has(tenantId)) {
            this.tenantData.set(tenantId, new Map());
        }
        
        const tenantTables = this.tenantData.get(tenantId)!;
        if (!tenantTables.has(tableName)) {
            tenantTables.set(tableName, []);
        }
    }

    private getTableData(tenantId: string, tableName: string): any[] {
        this.ensureTableExists(tenantId, tableName);
        return this.tenantData.get(tenantId)!.get(tableName)!;
    }

    private generateId(tableName: string): string {
        return generateSequentialId(tableName, this.lastInsertIds);
    }

    private extractTenantFromTable(tableName: string): string {
        // For PostgreSQL-style: tenant.table -> tenant
        if (tableName.includes('.')) {
            return tableName.split('.')[0];
        }
        // For SQLite-style: tenant_table -> tenant
        if (tableName.includes('_')) {
            return tableName.split('_')[0];
        }
        return 'default';
    }

    private extractActualTableName(tableName: string): string {
        // For PostgreSQL-style: tenant.table -> table
        if (tableName.includes('.')) {
            return tableName.split('.')[1];
        }
        // For SQLite-style: tenant_table -> table
        if (tableName.includes('_')) {
            const parts = tableName.split('_');
            return parts.slice(1).join('_'); // Handle table names with underscores
        }
        return tableName;
    }

    private matchesFilter(fieldValue: any, filterValue: any, operator: string): boolean {
        switch (operator) {
            case 'eq':
                return fieldValue === filterValue;
            case 'neq':
                return fieldValue !== filterValue;
            case 'gt':
                return fieldValue > filterValue;
            case 'gte':
                return fieldValue >= filterValue;
            case 'lt':
                return fieldValue < filterValue;
            case 'lte':
                return fieldValue <= filterValue;
            case 'like':
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase().replace(/%/g, ''));
            case 'startswith':
                return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase().replace(/%/g, ''));
            case 'endswith':
                return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase().replace(/%/g, ''));
            case 'in':
                return Array.isArray(filterValue) && filterValue.includes(fieldValue);
            case 'nin':
                return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
            default:
                return fieldValue === filterValue;
        }
    }



    private parseValue(value: string): any {
        // Remove quotes if present
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
            return value.slice(1, -1);
        }
        
        // Handle numeric values
        if (!isNaN(Number(value))) {
            return Number(value);
        }
        
        // Handle boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Return as string
        return value;
    }

    private parseInsertValues(valuesStr: string): any[] {
        // Simple parser for INSERT VALUES - handles quoted strings and basic values
        const values: any[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            
            if (!inQuotes && (char === "'" || char === '"')) {
                inQuotes = true;
                quoteChar = char;
            } else if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            } else if (!inQuotes && char === ',') {
                values.push(this.parseValue(current.trim()));
                current = '';
                continue;
            }
            
            current += char;
        }
        
        if (current.trim()) {
            values.push(this.parseValue(current.trim()));
        }
        
        return values;
    }

    private parseMultiRowValues(valuesSection: string): any[][] {
        // Parse multiple rows like: (val1, val2), (val3, val4), (val5, val6)
        const rows: any[][] = [];
        let current = '';
        let depth = 0;
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < valuesSection.length; i++) {
            const char = valuesSection[i];
            
            if (!inQuotes && (char === "'" || char === '"')) {
                inQuotes = true;
                quoteChar = char;
                current += char;
            } else if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
                current += char;
            } else if (!inQuotes && char === '(') {
                depth++;
                if (depth === 1) {
                    current = ''; // Start new row
                } else {
                    current += char;
                }
            } else if (!inQuotes && char === ')') {
                depth--;
                if (depth === 0) {
                    // End of row - parse the values
                    const values = this.parseInsertValues(current);
                    rows.push(values);
                    current = '';
                } else {
                    current += char;
                }
            } else if (!inQuotes && char === ',' && depth === 0) {
                // Skip commas between rows
                continue;
            } else {
                current += char;
            }
        }
        
        return rows;
    }



    // ===== Test utilities =====

    /**
     * Clear all data (useful for testing)
     */
    clearAllData(): void {
        this.tenantData.clear();
        this.tenantSchemas.clear();
        this.lastInsertIds.clear();
    }

    /**
     * Get all data for debugging
     */
    getAllData(): Map<string, Map<string, any[]>> {
        return this.tenantData;
    }

    /**
     * Seed test data
     */
    seedData(tenantId: string, tableName: string, records: any[]): void {
        this.ensureTableExists(tenantId, tableName);
        const tableData = this.getTableData(tenantId, tableName);
        tableData.push(...records);
    }
}