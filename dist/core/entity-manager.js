import { QueryManager } from './query-manager';
import { generateId } from '../utils/id-generation';
import { getCurrentTimestamp } from '../utils/date-helpers';
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
        this.queryManager = new QueryManager(databaseAdapter);
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
        // Use QueryManager to build and execute insert query
        const tableName = entityConfig.entity.table_name;
        const tenantId = context.tenantId || 'default';
        const { sql, params } = this.queryManager.buildInsertQuery(tableName, tenantId, data);
        const result = await this.databaseAdapter.execute(sql, params);
        if (result.changes === 0) {
            throw new Error(`Failed to create ${tableName} record`);
        }
        // For INSERT with RETURNING, we need to get the inserted record
        // Since execute doesn't return the inserted record, we need to query for it
        const insertedId = result.lastInsertId;
        if (insertedId) {
            const insertedRecord = await this.findById(entityConfig, insertedId, context);
            return insertedRecord || { id: insertedId, ...data };
        }
        // Fallback: return the data with a generated ID
        return { id: generateId(), ...data };
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
        const tableName = entityConfig.entity.table_name;
        const tenantId = context.tenantId || 'default';
        // Use QueryManager to build and execute find by ID query
        const { sql, params } = this.queryManager.buildFindByIdQuery(tableName, tenantId, id);
        // Add RLS conditions if provided
        let finalSql = sql;
        let finalParams = [...params];
        if (rlsConditions?.sql) {
            // Append RLS conditions to WHERE clause
            const whereIndex = finalSql.indexOf('WHERE');
            if (whereIndex !== -1) {
                const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
                const afterWhere = finalSql.substring(whereIndex + 5);
                finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                finalParams = [...finalParams, ...rlsConditions.params];
            }
        }
        const result = await this.databaseAdapter.query(finalSql, finalParams);
        return result.length > 0 ? result[0] : null;
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
        const tableName = entityConfig.entity.table_name;
        const tenantId = context.tenantId || 'default';
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
        // Use QueryManager to build and execute update query
        const { sql, params } = this.queryManager.buildUpdateQuery(tableName, tenantId, id, data);
        // Add RLS conditions if provided
        let finalSql = sql;
        let finalParams = [...params];
        if (rlsConditions?.sql) {
            // Append RLS conditions to WHERE clause
            const whereIndex = finalSql.indexOf('WHERE');
            if (whereIndex !== -1) {
                const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
                const afterWhere = finalSql.substring(whereIndex + 5);
                finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                finalParams = [...finalParams, ...rlsConditions.params];
            }
        }
        const result = await this.databaseAdapter.query(finalSql, finalParams);
        if (result.length === 0) {
            throw new Error(`Record not found or permission denied: ${tableName} with ID ${id}`);
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
        const tableName = entityConfig.entity.table_name;
        const tenantId = context.tenantId || 'default';
        // Use QueryManager to build and execute delete query
        const { sql, params } = this.queryManager.buildDeleteQuery(tableName, tenantId, id);
        // Add RLS conditions if provided
        let finalSql = sql;
        let finalParams = [...params];
        if (rlsConditions?.sql) {
            // Append RLS conditions to WHERE clause
            const whereIndex = finalSql.indexOf('WHERE');
            if (whereIndex !== -1) {
                const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
                const afterWhere = finalSql.substring(whereIndex + 5);
                finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                finalParams = [...finalParams, ...rlsConditions.params];
            }
        }
        const result = await this.databaseAdapter.execute(finalSql, finalParams);
        return result.changes > 0;
    }
    /**
     * Find entity records with conditions
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param options Query options
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Array of entity records
     */
    async find(entityConfig, conditions = [], options = {}, context = {}, rlsConditions) {
        // Use QueryManager for paginated query execution
        const result = await this.queryManager.executePaginatedQuery(entityConfig, conditions, {
            fields: options.fields,
            sort: options.sort,
            page: options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1,
            pageSize: options.limit || 10
        }, context);
        return result.data || [];
    }
    /**
     * Count entity records with conditions
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Count of records
     */
    async count(entityConfig, conditions = [], context = {}, rlsConditions) {
        const tableName = entityConfig.entity.table_name;
        const tenantId = context.tenantId || 'default';
        // Convert conditions to QueryFilter format for QueryManager
        const filters = conditions.map(condition => ({
            field: condition.field,
            value: condition.value,
            operator: condition.operator || 'eq'
        }));
        // Use QueryManager to build and execute count query
        const { sql, params } = this.queryManager.buildCountQuery(tableName, tenantId, filters);
        // Add RLS conditions if provided
        let finalSql = sql;
        let finalParams = [...params];
        if (rlsConditions?.sql) {
            // Append RLS conditions to WHERE clause
            const whereIndex = finalSql.indexOf('WHERE');
            if (whereIndex !== -1) {
                const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
                const afterWhere = finalSql.substring(whereIndex + 5);
                finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
                finalParams = [...finalParams, ...rlsConditions.params];
            }
        }
        const result = await this.databaseAdapter.query(finalSql, finalParams);
        return result.length > 0 ? parseInt(result[0].count, 10) : 0;
    }
    // === TABLE MANAGEMENT ===
    /**
     * Ensure entity table exists
     * @param entityConfig Entity configuration
     */
    async ensureEntityTable(entityConfig) {
        const tableName = entityConfig.entity.table_name;
        const exists = await this.databaseAdapter.tableExists(tableName);
        if (!exists) {
            await this.createEntityTable(entityConfig);
        }
        else {
            // Check if table needs to be updated with new fields
            await this.updateEntityTable(entityConfig);
        }
    }
    /**
     * Create entity table
     * @param entityConfig Entity configuration
     */
    async createEntityTable(entityConfig) {
        const tableName = entityConfig.entity.table_name;
        // Build column definitions
        const columns = entityConfig.fields.map((field) => ({
            name: field.name,
            type: this.getSqlType(field.type),
            primaryKey: field.name === 'id',
            notNull: field.is_required || field.name === 'id',
            unique: field.is_unique,
            default: field.default_value
        }));
        // Add system columns
        columns.push({ name: 'created_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined }, { name: 'updated_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined }, { name: 'created_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined }, { name: 'updated_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined });
        await this.databaseAdapter.createTable(tableName, columns);
    }
    /**
     * Update entity table with new fields
     * @param entityConfig Entity configuration
     */
    async updateEntityTable(entityConfig) {
        const tableName = entityConfig.entity.table_name;
        // Get existing columns
        const existingColumns = await this.databaseAdapter.getTableColumns(tableName);
        const existingColumnNames = new Set(existingColumns.map(col => col.name));
        // Find new fields that need to be added
        const newFields = entityConfig.fields.filter((field) => !existingColumnNames.has(field.name));
        if (newFields.length > 0) {
            // Add new columns one by one
            for (const field of newFields) {
                const columnDef = {
                    name: field.name,
                    type: this.getSqlType(field.type),
                    notNull: field.is_required,
                    unique: field.is_unique,
                    default: field.default_value
                };
                // Note: This is a simplified approach. In a real implementation,
                // you'd want to use ALTER TABLE ADD COLUMN statements
                console.log(`Would add column ${field.name} to table ${tableName}`);
            }
        }
    }
    /**
     * Get SQL type for field type
     * @param fieldType Field type
     * @returns SQL type
     */
    getSqlType(fieldType) {
        switch (fieldType) {
            case 'string':
            case 'email':
            case 'url':
            case 'text':
            case 'uuid':
                return 'VARCHAR(255)';
            case 'number':
                return 'DECIMAL(10,2)';
            case 'boolean':
                return 'BOOLEAN';
            case 'date':
                return 'DATE';
            case 'datetime':
                return 'DATETIME';
            default:
                return 'VARCHAR(255)';
        }
    }
}
//# sourceMappingURL=entity-manager.js.map