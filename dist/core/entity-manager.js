import { generateId } from '../utils/id-generation';
import { getCurrentTimestamp } from '../utils/date-helpers';
import { buildWhereClause, buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from '../utils/query-helpers';
/**
 * EntityManager class
 * Single responsibility: Handle CRUD operations on entities
 */
export class EntityManager {
    /**
     * Create a new EntityManager instance
     * @param databaseAdapter Database adapter
     */
    constructor(databaseAdapter) {
        this.databaseAdapter = databaseAdapter;
    }
    /**
     * Create a new entity record
     * @param entityConfig Entity configuration
     * @param data Entity data
     * @param context User context
     * @returns Created entity record
     */
    async create(entityConfig, data, context = {}) {
        // Ensure entity table exists
        await this.ensureEntityTable(entityConfig);
        // Generate ID if not provided
        if (!data.id) {
            data.id = generateId();
        }
        // Add system fields
        const timestamp = getCurrentTimestamp();
        data.created_at = timestamp;
        data.updated_at = timestamp;
        // Add creator ID if available in context
        if (context.user?.id) {
            data.created_by = context.user.id;
            data.updated_by = context.user.id;
        }
        // Insert data
        const tableName = entityConfig.entity.name;
        const query = buildInsertQuery(tableName, data, ['*']);
        const result = await this.databaseAdapter.query(query.sql, query.params);
        if (result.length === 0) {
            throw new Error(`Failed to create ${tableName} record`);
        }
        return result[0];
    }
    /**
     * Find entity record by ID
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Entity record or null if not found
     */
    async findById(entityConfig, id, context = {}, rlsConditions) {
        const tableName = entityConfig.entity.name;
        // Build conditions
        const conditions = [
            { field: 'id', operator: 'eq', value: id }
        ];
        // Add RLS conditions if provided
        if (rlsConditions?.sql) {
            // For now, we'll just add the raw SQL condition
            // In a real implementation, this would be properly integrated
            const query = buildSelectQuery({
                table: tableName,
                conditions
            });
            // Append RLS conditions to WHERE clause
            const sql = `${query.sql} AND (${rlsConditions.sql})`;
            const params = [...query.params, ...rlsConditions.params];
            const result = await this.databaseAdapter.query(sql, params);
            return result.length > 0 ? result[0] : null;
        }
        else {
            // Simple query without RLS
            const query = buildSelectQuery({
                table: tableName,
                conditions
            });
            const result = await this.databaseAdapter.query(query.sql, query.params);
            return result.length > 0 ? result[0] : null;
        }
    }
    /**
     * Update entity record
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param data Update data
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Updated entity record
     */
    async update(entityConfig, id, data, context = {}, rlsConditions) {
        const tableName = entityConfig.entity.name;
        // Add system fields
        data.updated_at = getCurrentTimestamp();
        // Add updater ID if available in context
        if (context.user?.id) {
            data.updated_by = context.user.id;
        }
        // Remove ID from update data if present
        if ('id' in data) {
            delete data.id;
        }
        // Build conditions
        const conditions = [
            { field: 'id', operator: 'eq', value: id }
        ];
        // Add RLS conditions if provided
        if (rlsConditions?.sql) {
            // For now, we'll just add the raw SQL condition
            // In a real implementation, this would be properly integrated
            const query = buildUpdateQuery(tableName, data, conditions, ['*']);
            // Append RLS conditions to WHERE clause
            const whereClauseIndex = query.sql.indexOf('WHERE');
            if (whereClauseIndex !== -1) {
                const beforeWhere = query.sql.substring(0, whereClauseIndex + 5); // +5 to include 'WHERE'
                const afterWhere = query.sql.substring(whereClauseIndex + 5);
                const sql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                const params = [...query.params, ...rlsConditions.params];
                const result = await this.databaseAdapter.query(sql, params);
                if (result.length === 0) {
                    throw new Error(`Record not found or permission denied: ${tableName} with ID ${id}`);
                }
                return result[0];
            }
        }
        // Simple update without RLS
        const query = buildUpdateQuery(tableName, data, conditions, ['*']);
        const result = await this.databaseAdapter.query(query.sql, query.params);
        if (result.length === 0) {
            throw new Error(`Record not found: ${tableName} with ID ${id}`);
        }
        return result[0];
    }
    /**
     * Delete entity record
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns True if record was deleted
     */
    async delete(entityConfig, id, context = {}, rlsConditions) {
        const tableName = entityConfig.entity.name;
        // Build conditions
        const conditions = [
            { field: 'id', operator: 'eq', value: id }
        ];
        // Add RLS conditions if provided
        if (rlsConditions?.sql) {
            // For now, we'll just add the raw SQL condition
            // In a real implementation, this would be properly integrated
            const query = buildDeleteQuery(tableName, conditions, ['id']);
            // Append RLS conditions to WHERE clause
            const whereClauseIndex = query.sql.indexOf('WHERE');
            if (whereClauseIndex !== -1) {
                const beforeWhere = query.sql.substring(0, whereClauseIndex + 5); // +5 to include 'WHERE'
                const afterWhere = query.sql.substring(whereClauseIndex + 5);
                const sql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                const params = [...query.params, ...rlsConditions.params];
                const result = await this.databaseAdapter.query(sql, params);
                return result.length > 0;
            }
        }
        // Simple delete without RLS
        const query = buildDeleteQuery(tableName, conditions, ['id']);
        const result = await this.databaseAdapter.query(query.sql, query.params);
        return result.length > 0;
    }
    /**
     * Find multiple entity records
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param options Query options
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Array of entity records
     */
    async find(entityConfig, conditions = [], options = {}, context = {}, rlsConditions) {
        const tableName = entityConfig.entity.name;
        // Build query
        const query = buildSelectQuery({
            table: tableName,
            fields: options.fields,
            conditions,
            sorting: options.sort,
            pagination: options.limit || options.offset ? {
                limit: options.limit || 0,
                offset: options.offset || 0
            } : undefined
        });
        // Add RLS conditions if provided
        if (rlsConditions?.sql) {
            // For now, we'll just add the raw SQL condition
            // In a real implementation, this would be properly integrated
            const whereClauseIndex = query.sql.indexOf('WHERE');
            if (whereClauseIndex !== -1) {
                const beforeWhere = query.sql.substring(0, whereClauseIndex + 5); // +5 to include 'WHERE'
                const afterWhere = query.sql.substring(whereClauseIndex + 5);
                const sql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                const params = [...query.params, ...rlsConditions.params];
                return await this.databaseAdapter.query(sql, params);
            }
            else {
                // No WHERE clause yet, add one with RLS conditions
                const sql = `${query.sql} WHERE ${rlsConditions.sql}`;
                const params = [...query.params, ...rlsConditions.params];
                return await this.databaseAdapter.query(sql, params);
            }
        }
        // Simple query without RLS
        return await this.databaseAdapter.query(query.sql, query.params);
    }
    /**
     * Count entity records
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Count of matching records
     */
    async count(entityConfig, conditions = [], context = {}, rlsConditions) {
        const tableName = entityConfig.entity.name;
        // Build query
        let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
        const params = [];
        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            const whereClause = buildWhereClause(conditions);
            if (whereClause.sql) {
                const whereSql = `WHERE ${whereClause.sql}`;
                sql += ` ${whereSql}`;
                params.push(...whereClause.params);
            }
        }
        // Add RLS conditions if provided
        if (rlsConditions?.sql) {
            // For now, we'll just add the raw SQL condition
            // In a real implementation, this would be properly integrated
            const whereClauseIndex = sql.indexOf('WHERE');
            if (whereClauseIndex !== -1) {
                const beforeWhere = sql.substring(0, whereClauseIndex + 5); // +5 to include 'WHERE'
                const afterWhere = sql.substring(whereClauseIndex + 5);
                const finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                const finalParams = [...params, ...rlsConditions.params];
                const result = await this.databaseAdapter.query(finalSql, finalParams);
                return result.length > 0 ? Number(result[0].count) : 0;
            }
            else {
                // No WHERE clause yet, add one with RLS conditions
                const finalSql = `${sql} WHERE ${rlsConditions.sql}`;
                const finalParams = [...params, ...rlsConditions.params];
                const result = await this.databaseAdapter.query(finalSql, finalParams);
                return result.length > 0 ? Number(result[0].count) : 0;
            }
        }
        // Simple query without RLS
        const result = await this.databaseAdapter.query(sql, params);
        return result.length > 0 ? Number(result[0].count) : 0;
    }
    /**
     * Ensure entity table exists
     * @param entityConfig Entity configuration
     */
    async ensureEntityTable(entityConfig) {
        const tableName = entityConfig.entity.name;
        // Check if table exists
        try {
            const result = await this.databaseAdapter.query('SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?', ['table', tableName]);
            if (result.length > 0 && result[0].count > 0) {
                // Table exists, check if it needs to be updated
                await this.updateEntityTable(entityConfig);
                return;
            }
        }
        catch (e) {
            // Table doesn't exist, continue to create it
        }
        // Create table
        await this.createEntityTable(entityConfig);
    }
    /**
     * Create entity table
     * @param entityConfig Entity configuration
     * @private
     */
    async createEntityTable(entityConfig) {
        const tableName = entityConfig.entity.name;
        const fields = entityConfig.fields;
        // Build column definitions
        const columns = [];
        const primaryKeys = [];
        for (const field of fields) {
            let columnDef = `"${field.name}" ${this.getSqlType(field.type)}`;
            if (field.is_required) {
                columnDef += ' NOT NULL';
            }
            if (field.is_unique) {
                columnDef += ' UNIQUE';
            }
            if (field.default_value !== undefined && field.default_value !== null) {
                columnDef += ` DEFAULT ${this.getSqlValue(field.default_value)}`;
            }
            columns.push(columnDef);
            if (field.is_primary_key) {
                primaryKeys.push(field.name);
            }
        }
        // Add system columns if not already defined
        const systemColumns = ['created_at', 'updated_at', 'created_by', 'updated_by'];
        for (const column of systemColumns) {
            if (!fields.some(f => f.name === column)) {
                if (column === 'created_at' || column === 'updated_at') {
                    columns.push(`"${column}" TEXT`);
                }
                else {
                    columns.push(`"${column}" TEXT`);
                }
            }
        }
        // Add primary key constraint if defined
        if (primaryKeys.length > 0) {
            columns.push(`PRIMARY KEY (${primaryKeys.map(pk => `"${pk}"`).join(', ')})`);
        }
        // Create table
        const sql = `CREATE TABLE "${tableName}" (${columns.join(', ')})`;
        await this.databaseAdapter.execute(sql);
    }
    /**
     * Update entity table
     * @param entityConfig Entity configuration
     * @private
     */
    async updateEntityTable(entityConfig) {
        const tableName = entityConfig.entity.name;
        const fields = entityConfig.fields;
        // Get existing columns
        const result = await this.databaseAdapter.query(`PRAGMA table_info("${tableName}")`, []);
        const existingColumns = result.map(r => r.name);
        // Add missing columns
        for (const field of fields) {
            if (!existingColumns.includes(field.name)) {
                let columnDef = `"${field.name}" ${this.getSqlType(field.type)}`;
                if (field.default_value !== undefined && field.default_value !== null) {
                    columnDef += ` DEFAULT ${this.getSqlValue(field.default_value)}`;
                }
                const sql = `ALTER TABLE "${tableName}" ADD COLUMN ${columnDef}`;
                await this.databaseAdapter.execute(sql);
            }
        }
        // Add system columns if not already defined
        const systemColumns = ['created_at', 'updated_at', 'created_by', 'updated_by'];
        for (const column of systemColumns) {
            if (!existingColumns.includes(column)) {
                const sql = `ALTER TABLE "${tableName}" ADD COLUMN "${column}" TEXT`;
                await this.databaseAdapter.execute(sql);
            }
        }
    }
    /**
     * Get SQL type for field type
     * @param fieldType Field type
     * @returns SQL type
     * @private
     */
    getSqlType(fieldType) {
        switch (fieldType.toLowerCase()) {
            case 'string':
                return 'TEXT';
            case 'number':
                return 'NUMERIC';
            case 'integer':
                return 'INTEGER';
            case 'boolean':
                return 'INTEGER';
            case 'date':
                return 'TEXT';
            case 'datetime':
                return 'TEXT';
            case 'json':
                return 'TEXT';
            case 'array':
                return 'TEXT';
            case 'object':
                return 'TEXT';
            default:
                return 'TEXT';
        }
    }
    /**
     * Get SQL value for field value
     * @param value Field value
     * @returns SQL value
     * @private
     */
    getSqlValue(value) {
        if (value === null) {
            return 'NULL';
        }
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        if (typeof value === 'object') {
            return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return String(value);
    }
}
//# sourceMappingURL=entity-manager.js.map