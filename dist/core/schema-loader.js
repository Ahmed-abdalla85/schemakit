import { safeJsonParse } from '../utils/json-helpers';
/**
 * SchemaLoader class
 * Single responsibility: Load and cache entity configurations from database
 */
export class SchemaLoader {
    /**
     * Create a new SchemaLoader instance
     * @param databaseAdapter Database adapter
     * @param options Options
     */
    constructor(databaseAdapter, options) {
        this.entityCache = new Map();
        this.cacheEnabled = true;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.databaseAdapter = databaseAdapter;
        this.cacheEnabled = options?.cacheEnabled !== false;
    }
    /**
     * Load entity configuration
     * @param entityName Entity name
     * @param context User context
     * @returns Entity configuration
     */
    async loadEntity(entityName, context = {}) {
        // Check if entity is already in cache
        if (this.cacheEnabled && this.entityCache.has(entityName)) {
            this.cacheHits++;
            return this.entityCache.get(entityName);
        }
        this.cacheMisses++;
        // Load entity definition
        const entityDefinition = await this.loadEntityDefinition(entityName);
        if (!entityDefinition) {
            throw new Error(`Entity '${entityName}' not found`);
        }
        // Load entity fields
        const fields = await this.loadEntityFields(entityDefinition.id);
        // Load entity permissions
        const permissions = await this.loadEntityPermissions(entityDefinition.id, context);
        // Load entity views
        const views = await this.loadEntityViews(entityDefinition.id);
        // Load entity workflows
        const workflows = await this.loadEntityWorkflows(entityDefinition.id);
        // Load entity RLS
        const rls = await this.loadEntityRLS(entityDefinition.id, context);
        // Create entity configuration
        const entityConfig = {
            entity: entityDefinition,
            fields,
            permissions,
            views,
            workflows,
            rls
        };
        // Cache entity configuration
        if (this.cacheEnabled) {
            this.entityCache.set(entityName, entityConfig);
        }
        return entityConfig;
    }
    /**
     * Reload entity configuration (bypass cache)
     * @param entityName Entity name
     * @param context User context
     * @returns Entity configuration
     */
    async reloadEntity(entityName, context = {}) {
        // Remove from cache if exists
        this.clearEntityCache(entityName);
        // Load entity configuration
        return this.loadEntity(entityName, context);
    }
    /**
     * Check if SchemaKit is installed
     * @returns True if installed
     */
    async isSchemaKitInstalled() {
        try {
            const result = await this.databaseAdapter.query('SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'system_entities']);
            return result.length > 0 && result[0].count > 0;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Get SchemaKit version
     * @returns Version string
     */
    async getVersion() {
        try {
            const result = await this.databaseAdapter.query('SELECT value FROM system_settings WHERE key = ?', ['version']);
            return result.length > 0 ? result[0].value : 'unknown';
        }
        catch (e) {
            return 'unknown';
        }
    }
    /**
     * Ensure system tables exist
     */
    async ensureSystemTables() {
        const systemTables = [
            'system_entities',
            'system_fields',
            'system_permissions',
            'system_views',
            'system_workflows',
            'system_rls',
            'system_settings'
        ];
        for (const table of systemTables) {
            const exists = await this.tableExists(table);
            if (!exists) {
                await this.createSystemTable(table);
            }
        }
    }
    /**
     * Reinstall SchemaKit
     * WARNING: This will delete all system tables and recreate them
     */
    async reinstall() {
        const systemTables = [
            'system_entities',
            'system_fields',
            'system_permissions',
            'system_views',
            'system_workflows',
            'system_rls',
            'system_settings'
        ];
        // Drop all system tables
        for (const table of systemTables) {
            try {
                await this.databaseAdapter.execute(`DROP TABLE IF EXISTS ${table}`);
            }
            catch (e) {
                console.error(`Error dropping table ${table}:`, e);
            }
        }
        // Recreate system tables
        await this.ensureSystemTables();
        // Set version
        await this.databaseAdapter.execute('INSERT INTO system_settings (key, value) VALUES (?, ?)', ['version', '1.0.0']);
        // Clear cache
        this.clearAllCache();
    }
    /**
     * Clear entity cache for a specific entity or all entities
     * @param entityName Optional entity name to clear
     */
    clearEntityCache(entityName) {
        if (entityName) {
            this.entityCache.delete(entityName);
        }
        else {
            this.entityCache.clear();
        }
    }
    /**
     * Clear all caches
     */
    clearAllCache() {
        this.entityCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getCacheStats() {
        const total = this.cacheHits + this.cacheMisses;
        return {
            entityCacheSize: this.entityCache.size,
            entities: Array.from(this.entityCache.keys()),
            hitRate: total > 0 ? this.cacheHits / total : undefined,
            missRate: total > 0 ? this.cacheMisses / total : undefined
        };
    }
    /**
     * Get all loaded entities
     * @returns Array of entity names
     */
    getLoadedEntities() {
        return Array.from(this.entityCache.keys());
    }
    /**
     * Load entity definition
     * @param entityName Entity name
     * @returns Entity definition or null if not found
     * @private
     */
    async loadEntityDefinition(entityName) {
        const entities = await this.databaseAdapter.query('SELECT * FROM system_entities WHERE name = ? AND is_active = ?', [entityName, 1]);
        if (entities.length === 0) {
            return null;
        }
        const entity = entities[0];
        // Parse metadata if it's a string
        if (entity.metadata && typeof entity.metadata === 'string') {
            entity.metadata = safeJsonParse(entity.metadata, {});
        }
        return entity;
    }
    /**
     * Load entity fields
     * @param entityId Entity ID
     * @returns Array of field definitions
     * @private
     */
    async loadEntityFields(entityId) {
        const fields = await this.databaseAdapter.query('SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, 1]);
        // Parse metadata for each field
        for (const field of fields) {
            if (field.metadata && typeof field.metadata === 'string') {
                field.metadata = safeJsonParse(field.metadata, {});
            }
            if (field.validation_rules && typeof field.validation_rules === 'string') {
                field.validation_rules = safeJsonParse(field.validation_rules, {});
            }
        }
        return fields;
    }
    /**
     * Load entity permissions
     * @param entityId Entity ID
     * @param context User context
     * @returns Array of permission definitions
     * @private
     */
    async loadEntityPermissions(entityId, context) {
        // Get user roles from context
        const userRoles = context.user?.roles || [];
        // If no roles, use 'public' role
        const roles = userRoles.length > 0 ? userRoles : ['public'];
        // Load permissions for entity and roles
        const permissions = await this.databaseAdapter.query('SELECT * FROM system_permissions WHERE entity_id = ? AND role IN (?) AND is_active = ?', [entityId, roles.join(','), 1]);
        // Parse conditions for each permission
        for (const permission of permissions) {
            if (permission.conditions && typeof permission.conditions === 'string') {
                permission.conditions = safeJsonParse(permission.conditions, {});
            }
        }
        return permissions;
    }
    /**
     * Load entity views
     * @param entityId Entity ID
     * @returns Array of view definitions
     * @private
     */
    async loadEntityViews(entityId) {
        const views = await this.databaseAdapter.query('SELECT * FROM system_views WHERE entity_id = ?', [entityId]);
        // Parse query and params for each view
        for (const view of views) {
            if (view.query_config && typeof view.query_config === 'string') {
                view.query_config = safeJsonParse(view.query_config, {});
            }
        }
        return views;
    }
    /**
     * Load entity workflows
     * @param entityId Entity ID
     * @returns Array of workflow definitions
     * @private
     */
    async loadEntityWorkflows(entityId) {
        const workflows = await this.databaseAdapter.query('SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, 1]);
        // Parse triggers, conditions, and actions for each workflow
        for (const workflow of workflows) {
            // Note: trigger_event is already a string, no need to parse
            if (workflow.conditions && typeof workflow.conditions === 'string') {
                workflow.conditions = safeJsonParse(workflow.conditions, {});
            }
            if (workflow.actions && typeof workflow.actions === 'string') {
                workflow.actions = safeJsonParse(workflow.actions, []);
            }
        }
        return workflows;
    }
    /**
     * Load entity RLS (Row-Level Security)
     * @param entityId Entity ID
     * @param context User context
     * @returns Array of RLS definitions
     * @private
     */
    async loadEntityRLS(entityId, context) {
        // Get user roles from context
        const userRoles = context.user?.roles || [];
        // If no roles, use 'public' role
        const roles = userRoles.length > 0 ? userRoles : ['public'];
        // Load RLS for entity and roles
        const rlsRules = await this.databaseAdapter.query('SELECT * FROM system_rls WHERE entity_id = ? AND role IN (?) AND is_active = ?', [entityId, roles.join(','), 1]);
        // Parse rls_config for each RLS rule
        for (const rule of rlsRules) {
            if (rule.rls_config && typeof rule.rls_config === 'string') {
                rule.rls_config = safeJsonParse(rule.rls_config, {
                    relationbetweenconditions: 'and',
                    conditions: []
                });
            }
        }
        return rlsRules;
    }
    /**
     * Check if a table exists
     * @param tableName Table name
     * @returns True if table exists
     * @private
     */
    async tableExists(tableName) {
        try {
            const result = await this.databaseAdapter.query('SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?', ['table', tableName]);
            return result.length > 0 && result[0].count > 0;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Create a system table
     * @param tableName Table name
     * @private
     */
    async createSystemTable(tableName) {
        let sql = '';
        switch (tableName) {
            case 'system_entities':
                sql = `
          CREATE TABLE system_entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT,
            description TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
          )
        `;
                break;
            case 'system_fields':
                sql = `
          CREATE TABLE system_fields (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            type TEXT NOT NULL,
            is_required INTEGER DEFAULT 0,
            is_unique INTEGER DEFAULT 0,
            is_primary_key INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            default_value TEXT,
            validation TEXT,
            metadata TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
                break;
            case 'system_permissions':
                sql = `
          CREATE TABLE system_permissions (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
                break;
            case 'system_views':
                sql = `
          CREATE TABLE system_views (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            query TEXT,
            params TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
                break;
            case 'system_workflows':
                sql = `
          CREATE TABLE system_workflows (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            triggers TEXT,
            conditions TEXT,
            actions TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
                break;
            case 'system_rls':
                sql = `
          CREATE TABLE system_rls (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
                break;
            case 'system_settings':
                sql = `
          CREATE TABLE system_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `;
                break;
            default:
                throw new Error(`Unknown system table: ${tableName}`);
        }
        await this.databaseAdapter.execute(sql);
    }
}
//# sourceMappingURL=schema-loader.js.map