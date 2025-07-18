(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../errors", "./validation-manager", "./workflow-manager"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EntityManager = void 0;
    const errors_1 = require("../errors");
    const validation_manager_1 = require("./validation-manager");
    const workflow_manager_1 = require("./workflow-manager");
    /**
     * Entity Manager class
     */
    class EntityManager {
        constructor(databaseAdapter) {
            this.databaseAdapter = databaseAdapter;
            this.validationManager = new validation_manager_1.ValidationManager();
            this.workflowManager = new workflow_manager_1.WorkflowManager();
        }
        /**
         * Create a new entity instance
         * @param entityConfig Entity configuration
         * @param data Entity data
         * @param context User context
         */
        async create(entityConfig, data, context = {}) {
            try {
                // Validate data against entity schema
                const validationResult = this.validationManager.validateEntityData(entityConfig, data, 'create');
                if (!validationResult.isValid) {
                    throw new errors_1.SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
                }
                // Ensure entity table exists
                await this.ensureEntityTable(entityConfig);
                // Prepare data for insertion
                const insertData = this.validationManager.prepareDataForInsert(entityConfig, data);
                // Generate ID if not provided
                if (!insertData.id) {
                    insertData.id = this.generateId();
                }
                // Add timestamps
                const now = new Date().toISOString();
                insertData.created_at = now;
                insertData.updated_at = now;
                // Execute pre-create workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'create', null, insertData, context);
                // Insert data into database
                const columns = Object.keys(insertData);
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map(col => insertData[col]);
                const sql = `INSERT INTO ${entityConfig.entity.table_name} (${columns.join(', ')}) VALUES (${placeholders})`;
                await this.databaseAdapter.execute(sql, values);
                // Execute post-create workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'create', null, insertData, context);
                return insertData;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to create entity: ${error}`);
            }
        }
        /**
         * Find entity instance by ID
         * @param entityConfig Entity configuration
         * @param id Entity ID
         * @param context User context
         * @param rlsConditions RLS conditions to apply
         */
        async findById(entityConfig, id, context = {}, rlsConditions = { sql: '', params: [] }) {
            try {
                // Ensure entity table exists
                await this.ensureEntityTable(entityConfig);
                // Build query
                let sql = `SELECT * FROM ${entityConfig.entity.table_name} WHERE id = ?`;
                const params = [id];
                // Add RLS conditions if any
                if (rlsConditions.sql) {
                    sql += ` AND (${rlsConditions.sql})`;
                    params.push(...rlsConditions.params);
                }
                // Execute query
                const results = await this.databaseAdapter.query(sql, params);
                if (results.length === 0) {
                    return null;
                }
                // Process result
                const result = this.validationManager.processEntityResult(entityConfig, results[0]);
                return result;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to find entity with id ${id}: ${error}`);
            }
        }
        /**
         * Update entity instance
         * @param entityConfig Entity configuration
         * @param id Entity ID
         * @param data Entity data
         * @param context User context
         * @param rlsConditions RLS conditions to apply
         */
        async update(entityConfig, id, data, context = {}, rlsConditions = { sql: '', params: [] }) {
            try {
                // Get current entity data
                const currentData = await this.findById(entityConfig, id, context, rlsConditions);
                if (!currentData) {
                    throw new errors_1.SchemaKitError(`Entity with id ${id} not found`);
                }
                // Validate data against entity schema
                const validationResult = this.validationManager.validateEntityData(entityConfig, data, 'update');
                if (!validationResult.isValid) {
                    throw new errors_1.SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
                }
                // Prepare data for update
                const updateData = this.validationManager.prepareDataForUpdate(entityConfig, data);
                // Add updated_at timestamp
                updateData.updated_at = new Date().toISOString();
                // Execute pre-update workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'update', currentData, updateData, context);
                // Check if there are fields to update
                if (Object.keys(updateData).length === 0) {
                    return currentData; // Nothing to update
                }
                // Build update query
                const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
                const values = Object.values(updateData);
                values.push(id); // Add ID for WHERE clause
                let sql = `UPDATE ${entityConfig.entity.table_name} SET ${setClause} WHERE id = ?`;
                // Add RLS conditions if any
                if (rlsConditions.sql) {
                    sql += ` AND (${rlsConditions.sql})`;
                    values.push(...rlsConditions.params);
                }
                // Execute update
                await this.databaseAdapter.execute(sql, values);
                // Get updated entity
                const updatedData = await this.findById(entityConfig, id, context, rlsConditions);
                if (!updatedData) {
                    throw new errors_1.SchemaKitError(`Failed to retrieve updated entity with id ${id}`);
                }
                // Execute post-update workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'update', currentData, updatedData, context);
                return updatedData;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to update entity with id ${id}: ${error}`);
            }
        }
        /**
         * Delete entity instance
         * @param entityConfig Entity configuration
         * @param id Entity ID
         * @param context User context
         * @param rlsConditions RLS conditions to apply
         */
        async delete(entityConfig, id, context = {}, rlsConditions = { sql: '', params: [] }) {
            try {
                // Get current entity data
                const currentData = await this.findById(entityConfig, id, context, rlsConditions);
                if (!currentData) {
                    throw new errors_1.SchemaKitError(`Entity with id ${id} not found`);
                }
                // Execute pre-delete workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'delete', currentData, null, context);
                // Execute delete
                let sql = `DELETE FROM ${entityConfig.entity.table_name} WHERE id = ?`;
                const params = [id];
                // Add RLS conditions if any
                if (rlsConditions.sql) {
                    sql += ` AND (${rlsConditions.sql})`;
                    params.push(...rlsConditions.params);
                }
                const result = await this.databaseAdapter.execute(sql, params);
                // Execute post-delete workflows
                await this.workflowManager.executeWorkflows(entityConfig, 'delete', currentData, null, context);
                return result.changes > 0;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to delete entity with id ${id}: ${error}`);
            }
        }
        /**
         * Ensure entity table exists
         * @param entityConfig Entity configuration
         * @private
         */
        async ensureEntityTable(entityConfig) {
            const tableName = entityConfig.entity.table_name;
            // Check if table exists
            const tableExists = await this.databaseAdapter.tableExists(tableName);
            if (tableExists) {
                return;
            }
            // Create table columns
            const columns = [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'created_at', type: 'TEXT', notNull: true },
                { name: 'updated_at', type: 'TEXT', notNull: true }
            ];
            // Add columns for each field
            for (const field of entityConfig.fields) {
                // Skip special fields that are already added
                if (['id', 'created_at', 'updated_at'].includes(field.name)) {
                    continue;
                }
                // Map field type to SQL type
                let sqlType;
                switch (field.type) {
                    case 'string':
                        sqlType = 'TEXT';
                        break;
                    case 'number':
                        sqlType = 'REAL';
                        break;
                    case 'boolean':
                        sqlType = 'INTEGER';
                        break;
                    case 'date':
                        sqlType = 'TEXT';
                        break;
                    case 'json':
                    case 'array':
                        sqlType = 'TEXT';
                        break;
                    case 'reference':
                        sqlType = 'TEXT';
                        break;
                    default:
                        sqlType = 'TEXT';
                }
                // Create column definition
                const column = {
                    name: field.name,
                    type: sqlType,
                    notNull: field.is_required,
                    unique: field.is_unique
                };
                // Add default value if specified
                if (field.default_value !== undefined) {
                    column.default = field.default_value;
                }
                // Add reference if specified
                if (field.type === 'reference' && field.reference_entity) {
                    column.references = {
                        table: `entity_${field.reference_entity}`,
                        column: 'id'
                    };
                }
                columns.push(column);
            }
            // Create table
            await this.databaseAdapter.createTable(tableName, columns);
        }
        /**
         * Generate a unique ID
         * @private
         */
        generateId() {
            // Simple UUID v4 implementation
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }
    exports.EntityManager = EntityManager;
});
//# sourceMappingURL=entity-manager.js.map