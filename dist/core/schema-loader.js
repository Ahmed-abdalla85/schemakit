import { SchemaKitError } from '../errors';
/**
 * Schema Loader class
 */
export class SchemaLoader {
    constructor(databaseAdapter, options = {}) {
        this.entityCache = new Map();
        this.databaseAdapter = databaseAdapter;
        this.options = {
            cache: {
                enabled: true,
                ttl: 3600000 // 1 hour
            },
            ...options
        };
    }
    /**
     * Load entity configuration from database
     * @param entityName Entity name
     * @param context User context
     */
    async loadEntity(entityName, context = {}) {
        // Check if entity is already in cache
        if (this.options.cache?.enabled && this.entityCache.has(entityName)) {
            return this.entityCache.get(entityName);
        }
        try {
            // Ensure database connection
            if (!this.databaseAdapter.isConnected()) {
                await this.databaseAdapter.connect();
            }
            // Check if system tables exist, create them if not
            await this.ensureSystemTables();
            // Load entity definition
            const entityDef = await this.loadEntityDefinition(entityName);
            if (!entityDef) {
                throw new SchemaKitError(`Entity '${entityName}' not found`);
            }
            // Load fields
            const fields = await this.loadEntityFields(entityDef.id);
            // Load permissions
            const permissions = await this.loadEntityPermissions(entityDef.id, context);
            // Load views
            const views = await this.loadEntityViews(entityDef.id);
            // Load workflows
            const workflows = await this.loadEntityWorkflows(entityDef.id);
            // Load RLS (Row Level Security)
            const rls = await this.loadEntityRLS(entityDef.id, context);
            // Create entity configuration
            const entityConfig = {
                entity: entityDef,
                fields,
                permissions,
                views,
                workflows,
                rls
            };
            // Store in cache if enabled
            if (this.options.cache?.enabled) {
                this.entityCache.set(entityName, entityConfig);
            }
            return entityConfig;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to load entity '${entityName}': ${error}`);
        }
    }
    /**
     * Reload entity configuration from database
     * @param entityName Entity name
     */
    async reloadEntity(entityName) {
        // Remove from cache if present
        if (this.entityCache.has(entityName)) {
            this.entityCache.delete(entityName);
        }
        // Load fresh entity configuration
        return this.loadEntity(entityName);
    }
    /**
     * Get loaded entity names
     */
    getLoadedEntities() {
        return Array.from(this.entityCache.keys());
    }
    /**
     * Ensure system tables exist
     * @private
     */
    async ensureSystemTables() {
        // Check if system_entities table exists
        const entitiesTableExists = await this.databaseAdapter.tableExists('system_entities');
        if (!entitiesTableExists) {
            // Create system_entities table
            await this.databaseAdapter.createTable('system_entities', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'name', type: 'TEXT', notNull: true, unique: true },
                { name: 'table_name', type: 'TEXT', notNull: true },
                { name: 'display_name', type: 'TEXT', notNull: true },
                { name: 'description', type: 'TEXT' },
                { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
                { name: 'created_at', type: 'TEXT', notNull: true },
                { name: 'updated_at', type: 'TEXT', notNull: true },
                { name: 'metadata', type: 'TEXT' } // JSON string
            ]);
        }
        // Check if system_fields table exists
        const fieldsTableExists = await this.databaseAdapter.tableExists('system_fields');
        if (!fieldsTableExists) {
            // Create system_fields table
            await this.databaseAdapter.createTable('system_fields', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
                { name: 'name', type: 'TEXT', notNull: true },
                { name: 'type', type: 'TEXT', notNull: true },
                { name: 'is_required', type: 'BOOLEAN', notNull: true, default: false },
                { name: 'is_unique', type: 'BOOLEAN', notNull: true, default: false },
                { name: 'default_value', type: 'TEXT' },
                { name: 'validation_rules', type: 'TEXT' }, // JSON string
                { name: 'display_name', type: 'TEXT', notNull: true },
                { name: 'description', type: 'TEXT' },
                { name: 'order_index', type: 'INTEGER', notNull: true, default: 0 },
                { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
                { name: 'reference_entity', type: 'TEXT' },
                { name: 'metadata', type: 'TEXT' } // JSON string
            ]);
        }
        // Check if system_permissions table exists
        const permissionsTableExists = await this.databaseAdapter.tableExists('system_permissions');
        if (!permissionsTableExists) {
            // Create system_permissions table
            await this.databaseAdapter.createTable('system_permissions', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
                { name: 'role', type: 'TEXT', notNull: true },
                { name: 'action', type: 'TEXT', notNull: true },
                { name: 'conditions', type: 'TEXT' }, // JSON string
                { name: 'is_allowed', type: 'BOOLEAN', notNull: true, default: true },
                { name: 'created_at', type: 'TEXT', notNull: true },
                { name: 'field_permissions', type: 'TEXT' } // JSON string
            ]);
        }
        // Check if system_views table exists
        const viewsTableExists = await this.databaseAdapter.tableExists('system_views');
        if (!viewsTableExists) {
            // Create system_views table
            await this.databaseAdapter.createTable('system_views', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
                { name: 'name', type: 'TEXT', notNull: true },
                { name: 'query_config', type: 'TEXT', notNull: true }, // JSON string
                { name: 'fields', type: 'TEXT', notNull: true }, // JSON string
                { name: 'is_default', type: 'BOOLEAN', notNull: true, default: false },
                { name: 'created_by', type: 'TEXT' },
                { name: 'is_public', type: 'BOOLEAN', notNull: true, default: false },
                { name: 'metadata', type: 'TEXT' } // JSON string
            ]);
        }
        // Check if system_workflows table exists
        const workflowsTableExists = await this.databaseAdapter.tableExists('system_workflows');
        if (!workflowsTableExists) {
            // Create system_workflows table
            await this.databaseAdapter.createTable('system_workflows', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
                { name: 'name', type: 'TEXT', notNull: true },
                { name: 'trigger_event', type: 'TEXT', notNull: true },
                { name: 'conditions', type: 'TEXT' }, // JSON string
                { name: 'actions', type: 'TEXT', notNull: true }, // JSON string
                { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
                { name: 'order_index', type: 'INTEGER', notNull: true, default: 0 },
                { name: 'metadata', type: 'TEXT' } // JSON string
            ]);
        }
        // Check if system_rls table exists
        const rlsTableExists = await this.databaseAdapter.tableExists('system_rls');
        if (!rlsTableExists) {
            // Create system_rls table
            await this.databaseAdapter.createTable('system_rls', [
                { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
                { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
                { name: 'role', type: 'TEXT', notNull: true },
                { name: 'view_id', type: 'TEXT' },
                { name: 'rls_config', type: 'TEXT', notNull: true }, // JSON string
                { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
                { name: 'created_at', type: 'TEXT', notNull: true },
                { name: 'updated_at', type: 'TEXT', notNull: true }
            ]);
        }
    }
    /**
     * Load entity definition from database
     * @param entityName Entity name
     * @private
     */
    async loadEntityDefinition(entityName) {
        const entities = await this.databaseAdapter.query('SELECT * FROM system_entities WHERE name = ? AND is_active = ?', [entityName, true]);
        if (entities.length === 0) {
            return null;
        }
        const entity = entities[0];
        // Parse metadata JSON if present
        if (entity.metadata && typeof entity.metadata === 'string') {
            try {
                entity.metadata = JSON.parse(entity.metadata);
            }
            catch (e) {
                // If JSON parsing fails, keep as string
            }
        }
        return entity;
    }
    /**
     * Load entity fields from database
     * @param entityId Entity ID
     * @private
     */
    async loadEntityFields(entityId) {
        const fields = await this.databaseAdapter.query('SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, true]);
        // Parse JSON fields
        return fields.map(field => {
            // Parse validation_rules JSON if present
            if (field.validation_rules && typeof field.validation_rules === 'string') {
                try {
                    field.validation_rules = JSON.parse(field.validation_rules);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            // Parse metadata JSON if present
            if (field.metadata && typeof field.metadata === 'string') {
                try {
                    field.metadata = JSON.parse(field.metadata);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            return field;
        });
    }
    /**
     * Load entity permissions from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    async loadEntityPermissions(entityId, context) {
        // Get user roles from context
        const userRoles = context.user?.roles || [];
        // If no roles specified, load all permissions
        const params = [entityId];
        let roleCondition = '';
        if (userRoles.length > 0) {
            roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
            params.push(...userRoles);
        }
        const permissions = await this.databaseAdapter.query(`SELECT * FROM system_permissions WHERE entity_id = ? ${roleCondition}`, params);
        // Parse JSON fields
        return permissions.map(permission => {
            // Parse conditions JSON if present
            if (permission.conditions && typeof permission.conditions === 'string') {
                try {
                    permission.conditions = JSON.parse(permission.conditions);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            // Parse field_permissions JSON if present
            if (permission.field_permissions && typeof permission.field_permissions === 'string') {
                try {
                    permission.field_permissions = JSON.parse(permission.field_permissions);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            return permission;
        });
    }
    /**
     * Load entity views from database
     * @param entityId Entity ID
     * @private
     */
    async loadEntityViews(entityId) {
        const views = await this.databaseAdapter.query('SELECT * FROM system_views WHERE entity_id = ?', [entityId]);
        // Parse JSON fields
        return views.map(view => {
            // Parse query_config JSON
            if (view.query_config && typeof view.query_config === 'string') {
                try {
                    view.query_config = JSON.parse(view.query_config);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            // Parse fields JSON
            if (view.fields && typeof view.fields === 'string') {
                try {
                    view.fields = JSON.parse(view.fields);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            // Parse metadata JSON if present
            if (view.metadata && typeof view.metadata === 'string') {
                try {
                    view.metadata = JSON.parse(view.metadata);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            return view;
        });
    }
    /**
     * Load entity workflows from database
     * @param entityId Entity ID
     * @private
     */
    async loadEntityWorkflows(entityId) {
        const workflows = await this.databaseAdapter.query('SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, true]);
        // Parse JSON fields
        return workflows.map(workflow => {
            // Parse conditions JSON if present
            if (workflow.conditions && typeof workflow.conditions === 'string') {
                try {
                    workflow.conditions = JSON.parse(workflow.conditions);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            // Parse actions JSON
            if (workflow.actions && typeof workflow.actions === 'string') {
                try {
                    workflow.actions = JSON.parse(workflow.actions);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string or empty array
                    workflow.actions = [];
                }
            }
            // Parse metadata JSON if present
            if (workflow.metadata && typeof workflow.metadata === 'string') {
                try {
                    workflow.metadata = JSON.parse(workflow.metadata);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            return workflow;
        });
    }
    /**
     * Load entity RLS (Row Level Security) from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    async loadEntityRLS(entityId, context) {
        // Get user roles from context
        const userRoles = context.user?.roles || [];
        // If no roles specified, load all RLS rules
        const params = [entityId, true];
        let roleCondition = '';
        if (userRoles.length > 0) {
            roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
            params.push(...userRoles);
        }
        const rlsRules = await this.databaseAdapter.query(`SELECT * FROM system_rls WHERE entity_id = ? AND is_active = ? ${roleCondition}`, params);
        // Parse JSON fields
        return rlsRules.map(rls => {
            // Parse rls_config JSON
            if (rls.rls_config && typeof rls.rls_config === 'string') {
                try {
                    rls.rls_config = JSON.parse(rls.rls_config);
                }
                catch (e) {
                    // If JSON parsing fails, use default structure
                    rls.rls_config = {
                        relationbetweenconditions: 'and',
                        conditions: []
                    };
                }
            }
            return rls;
        });
    }
}
//# sourceMappingURL=schema-loader.js.map