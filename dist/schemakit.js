import { SchemaLoader } from './core/schema-loader';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { QueryManager } from './core/query-manager';
import { WorkflowManager } from './core/workflow-manager';
import { SchemaKitError } from './errors';
/**
 * SchemaKit - Main class for entity management
 *
 * Simple API: schemaKit.entity('users').create(data)
 */
export class SchemaKit {
    /**
     * Create a new SchemaKit instance
     * @param options Configuration options
     */
    constructor(options = {}) {
        // Entity cache
        this.entityCache = new Map();
        this.options = options;
        // Initialize database adapter
        const adapterType = options.adapter?.type || 'inmemory';
        const adapterConfig = options.adapter?.config || {};
        this.databaseAdapter = this.createDatabaseAdapter(adapterType, adapterConfig);
    }
    /**
     * Initialize SchemaKit
     * @returns Promise<SchemaKit>
     */
    async init() {
        try {
            // Connect to database
            await this.databaseAdapter.connect();
            // Check if database is installed
            if (!await this.isInstalled()) {
                await this.install();
            }
            // Initialize managers
            this.schemaLoader = new SchemaLoader(this.databaseAdapter);
            this.entityManager = new EntityManager(this.databaseAdapter);
            this.validationManager = new ValidationManager();
            this.permissionManager = new PermissionManager(this.databaseAdapter);
            this.queryManager = new QueryManager(this.databaseAdapter);
            this.workflowManager = new WorkflowManager(this.databaseAdapter);
            return this;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to initialize SchemaKit: ${error}`);
        }
    }
    /**
     * Get entity object for CRUD operations
     * @param entityName Entity name
     * @returns Entity object with CRUD methods
     */
    entity(entityName) {
        const self = this;
        return {
            // CRUD operations
            async create(data, context = {}) {
                return await self.createEntity(entityName, data, context);
            },
            async read(filters = {}, context = {}) {
                return await self.readEntity(entityName, filters, context);
            },
            async update(id, data, context = {}) {
                return await self.updateEntity(entityName, id, data, context);
            },
            async delete(id, context = {}) {
                return await self.deleteEntity(entityName, id, context);
            },
            async findById(id, context = {}) {
                return await self.findByIdEntity(entityName, id, context);
            },
            // Properties
            get fields() {
                return self.getEntityFields(entityName);
            },
            get workflows() {
                return self.getEntityWorkflows(entityName);
            },
            get schema() {
                return self.getEntitySchema(entityName);
            }
        };
    }
    /**
     * Check if database is installed
     * @returns Promise<boolean>
     */
    async isInstalled() {
        try {
            const result = await this.databaseAdapter.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'system_entities'");
            return result.length > 0 && result[0].count > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Install database schema
     * @returns Promise<void>
     */
    async install() {
        try {
            // Run schema.sql
            const schemaSql = await this.loadSchemaFile();
            await this.databaseAdapter.execute(schemaSql);
            // Run seed.sql
            const seedSql = await this.loadSeedFile();
            if (seedSql) {
                await this.databaseAdapter.execute(seedSql);
            }
        }
        catch (error) {
            throw new SchemaKitError(`Failed to install database: ${error}`);
        }
    }
    /**
     * Get database version
     * @returns Promise<string | null>
     */
    async getVersion() {
        try {
            const result = await this.databaseAdapter.query("SELECT version FROM system_config WHERE key = 'version'");
            return result.length > 0 ? result[0].version : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Reinstall database (drop and recreate)
     * @returns Promise<void>
     */
    async reinstall() {
        // Drop all tables and recreate
        await this.install();
    }
    /**
     * Load entity configuration
     * @param entityName Entity name
     * @param context User context
     * @returns Promise<EntityConfiguration>
     */
    async loadEntity(entityName, context = {}) {
        // Check cache first
        if (this.entityCache.has(entityName)) {
            return this.entityCache.get(entityName);
        }
        // Load from database
        const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
        // Cache the result
        this.entityCache.set(entityName, entityConfig);
        return entityConfig;
    }
    /**
     * Clear entity cache
     * @param entityName Optional entity name to clear specific entity
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
     * Disconnect from database
     * @returns Promise<void>
     */
    async disconnect() {
        await this.databaseAdapter.disconnect();
    }
    // === PRIVATE METHODS ===
    /**
     * Create entity
     * @param entityName Entity name
     * @param data Entity data
     * @param context User context
     * @returns Promise<Record<string, any>>
     */
    async createEntity(entityName, data, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'create', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for creating ${entityName}`);
            }
            // Validate data
            const validationResult = await this.validationManager.validate(entityConfig, data, 'create');
            if (!validationResult.isValid) {
                throw new SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
            }
            // Execute pre-create workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'before_create', null, data, context);
            // Create entity using EntityManager
            const result = await this.entityManager.create(entityConfig, data, context);
            // Execute post-create workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'after_create', null, result, context);
            return result;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to create ${entityName}: ${error}`);
        }
    }
    /**
     * Read entities
     * @param entityName Entity name
     * @param filters Query filters
     * @param context User context
     * @returns Promise<any>
     */
    async readEntity(entityName, filters = {}, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for reading ${entityName}`);
            }
            // Execute query using QueryManager
            return await this.queryManager.executePaginatedQuery(entityConfig, [], filters, context);
        }
        catch (error) {
            throw new SchemaKitError(`Failed to read ${entityName}: ${error}`);
        }
    }
    /**
     * Update entity
     * @param entityName Entity name
     * @param id Entity ID
     * @param data Entity data
     * @param context User context
     * @returns Promise<Record<string, any>>
     */
    async updateEntity(entityName, id, data, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'update', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for updating ${entityName}`);
            }
            // Apply RLS conditions
            const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
            // Get current data for workflows
            const currentData = await this.entityManager.findById(entityConfig, id, context, rlsConditions);
            if (!currentData) {
                throw new SchemaKitError(`Entity ${entityName} with id ${id} not found`);
            }
            // Validate data
            const validationResult = await this.validationManager.validate(entityConfig, data, 'update');
            if (!validationResult.isValid) {
                throw new SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
            }
            // Execute pre-update workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'before_update', currentData, data, context);
            // Update entity using EntityManager
            const result = await this.entityManager.update(entityConfig, id, data, context, rlsConditions);
            // Execute post-update workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'after_update', currentData, result, context);
            return result;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to update ${entityName} with id ${id}: ${error}`);
        }
    }
    /**
     * Delete entity
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     * @returns Promise<boolean>
     */
    async deleteEntity(entityName, id, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'delete', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for deleting ${entityName}`);
            }
            // Apply RLS conditions
            const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
            // Get current data for workflows
            const currentData = await this.entityManager.findById(entityConfig, id, context, rlsConditions);
            if (!currentData) {
                throw new SchemaKitError(`Entity ${entityName} with id ${id} not found`);
            }
            // Execute pre-delete workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'before_delete', currentData, null, context);
            // Delete entity using EntityManager
            const result = await this.entityManager.delete(entityConfig, id, context, rlsConditions);
            // Execute post-delete workflows
            await this.workflowManager.executeWorkflows(entityConfig, 'after_delete', currentData, null, context);
            return result;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to delete ${entityName} with id ${id}: ${error}`);
        }
    }
    /**
     * Find entity by ID
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     * @returns Promise<Record<string, any> | null>
     */
    async findByIdEntity(entityName, id, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for reading ${entityName}`);
            }
            // Apply RLS conditions
            const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
            // Find entity using EntityManager
            return await this.entityManager.findById(entityConfig, id, context, rlsConditions);
        }
        catch (error) {
            throw new SchemaKitError(`Failed to find ${entityName} with id ${id}: ${error}`);
        }
    }
    /**
     * Get entity fields
     * @param entityName Entity name
     * @returns Promise<any[]>
     */
    async getEntityFields(entityName) {
        try {
            const entityConfig = await this.loadEntity(entityName);
            return entityConfig.fields;
        }
        catch {
            return [];
        }
    }
    /**
     * Get entity workflows
     * @param entityName Entity name
     * @returns Promise<any[]>
     */
    async getEntityWorkflows(entityName) {
        try {
            const entityConfig = await this.loadEntity(entityName);
            return entityConfig.workflows;
        }
        catch {
            return [];
        }
    }
    /**
     * Get entity schema
     * @param entityName Entity name
     * @returns Promise<any>
     */
    async getEntitySchema(entityName) {
        try {
            const entityConfig = await this.loadEntity(entityName);
            return this.generateJsonSchema(entityConfig);
        }
        catch {
            return {};
        }
    }
    /**
     * Generate JSON schema from entity configuration
     * @param entityConfig Entity configuration
     * @returns JSON schema object
     */
    generateJsonSchema(entityConfig) {
        const properties = {};
        const required = [];
        entityConfig.fields.forEach((field) => {
            const fieldName = field.name;
            properties[fieldName] = {
                type: this.mapFieldTypeToJsonSchema(field.type),
                ...(field.default_value !== undefined && { default: field.default_value })
            };
            if (field.validation_rules) {
                const validationRules = typeof field.validation_rules === 'string'
                    ? JSON.parse(field.validation_rules)
                    : field.validation_rules;
                if (validationRules.minLength)
                    properties[fieldName].minLength = validationRules.minLength;
                if (validationRules.maxLength)
                    properties[fieldName].maxLength = validationRules.maxLength;
                if (validationRules.min)
                    properties[fieldName].minimum = validationRules.min;
                if (validationRules.max)
                    properties[fieldName].maximum = validationRules.max;
                if (validationRules.pattern)
                    properties[fieldName].pattern = validationRules.pattern;
                if (validationRules.enum)
                    properties[fieldName].enum = validationRules.enum;
            }
            if (field.is_required)
                required.push(fieldName);
        });
        return { type: 'object', properties, required };
    }
    /**
     * Map field type to JSON schema type
     * @param type Field type
     * @returns JSON schema type
     */
    mapFieldTypeToJsonSchema(type) {
        switch (type) {
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'date':
            case 'datetime':
            case 'email':
            case 'url':
            case 'text':
            case 'uuid':
            default: return 'string';
        }
    }
    /**
     * Create database adapter
     * @param type Adapter type
     * @param config Adapter configuration
     * @returns DatabaseAdapter
     */
    createDatabaseAdapter(type, config) {
        switch (type.toLowerCase()) {
            case 'postgres':
                const { PostgresAdapter } = require('./database/adapters/postgres');
                return new PostgresAdapter(config);
            case 'sqlite':
                const { SQLiteAdapter } = require('./database/adapters/sqlite');
                return new SQLiteAdapter(config);
            case 'inmemory':
            default:
                const { InMemoryAdapter } = require('./database/adapters/inmemory');
                return new InMemoryAdapter(config);
        }
    }
    /**
     * Load schema file
     * @returns Promise<string>
     */
    async loadSchemaFile() {
        // In a real implementation, this would load from sql/schema.sql
        return `
      CREATE TABLE IF NOT EXISTS system_entities (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        table_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS system_fields (
        id VARCHAR(255) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT FALSE,
        is_unique BOOLEAN DEFAULT FALSE,
        default_value TEXT,
        validation_rules TEXT,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (entity_id) REFERENCES system_entities(id)
      );
      
      CREATE TABLE IF NOT EXISTS system_permissions (
        id VARCHAR(255) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        is_allowed BOOLEAN DEFAULT FALSE,
        conditions TEXT,
        FOREIGN KEY (entity_id) REFERENCES system_entities(id)
      );
      
      CREATE TABLE IF NOT EXISTS system_workflows (
        id VARCHAR(255) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        trigger_event VARCHAR(50) NOT NULL,
        conditions TEXT,
        actions TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (entity_id) REFERENCES system_entities(id)
      );
      
      CREATE TABLE IF NOT EXISTS system_views (
        id VARCHAR(255) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        query_config TEXT,
        fields TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        is_public BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (entity_id) REFERENCES system_entities(id)
      );
      
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    }
    /**
     * Load seed file
     * @returns Promise<string | null>
     */
    async loadSeedFile() {
        // In a real implementation, this would load from sql/seed.sql
        return `
      INSERT OR IGNORE INTO system_config (key, value) VALUES ('version', '1.0.0');
    `;
    }
    // === STATIC METHODS ===
    /**
     * Initialize default SchemaKit instance
     * @param options Configuration options
     * @returns Promise<SchemaKit>
     */
    static async initDefault(options) {
        if (!SchemaKit.defaultInstance) {
            SchemaKit.defaultInstance = new SchemaKit(options);
            await SchemaKit.defaultInstance.init();
        }
        return SchemaKit.defaultInstance;
    }
    /**
     * Initialize named SchemaKit instance
     * @param instanceName Instance name
     * @param options Configuration options
     * @returns Promise<SchemaKit>
     */
    static async init(instanceName, options) {
        if (!SchemaKit.instances.has(instanceName)) {
            const instance = new SchemaKit(options);
            await instance.init();
            SchemaKit.instances.set(instanceName, instance);
        }
        return SchemaKit.instances.get(instanceName);
    }
    /**
     * Get default SchemaKit instance
     * @returns SchemaKit
     */
    static getDefault() {
        if (!SchemaKit.defaultInstance) {
            throw new SchemaKitError('Default SchemaKit instance not initialized. Call initDefault() first.');
        }
        return SchemaKit.defaultInstance;
    }
    /**
     * Get named SchemaKit instance
     * @param instanceName Instance name
     * @returns SchemaKit
     */
    static getInstance(instanceName) {
        if (!SchemaKit.instances.has(instanceName)) {
            throw new SchemaKitError(`SchemaKit instance '${instanceName}' not found. Call init() first.`);
        }
        return SchemaKit.instances.get(instanceName);
    }
    /**
     * Clear entity cache
     * @param entityName Optional entity name
     * @param tenantId Optional tenant ID
     * @param instanceName Optional instance name
     */
    static clearEntityCache(entityName, tenantId, instanceName) {
        if (instanceName) {
            const instance = SchemaKit.instances.get(instanceName);
            if (instance) {
                instance.clearEntityCache(entityName);
            }
        }
        else if (SchemaKit.defaultInstance) {
            SchemaKit.defaultInstance.clearEntityCache(entityName);
        }
    }
    /**
     * Clear all caches
     */
    static clearAllCache() {
        // Clear all instance caches
        SchemaKit.instances.forEach(instance => {
            instance.clearEntityCache();
        });
        // Clear default instance cache
        if (SchemaKit.defaultInstance) {
            SchemaKit.defaultInstance.clearEntityCache();
        }
    }
    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    static getCacheStats() {
        const instances = Array.from(SchemaKit.instances.keys());
        const defaultInstance = SchemaKit.defaultInstance;
        let entityCacheSize = 0;
        const entities = [];
        // Count entities in all instances
        SchemaKit.instances.forEach(instance => {
            entityCacheSize += instance.entityCache.size;
            entities.push(...Array.from(instance.entityCache.keys()));
        });
        // Count entities in default instance
        if (defaultInstance) {
            entityCacheSize += defaultInstance.entityCache.size;
            entities.push(...Array.from(defaultInstance.entityCache.keys()));
        }
        return {
            entityCacheSize,
            instanceCacheSize: instances.length + (defaultInstance ? 1 : 0),
            entities: [...new Set(entities)],
            instances
        };
    }
    /**
     * List all instances
     * @returns string[]
     */
    static listInstances() {
        return Array.from(SchemaKit.instances.keys());
    }
    /**
     * Shutdown instance
     * @param instanceName Optional instance name
     * @returns Promise<void>
     */
    static async shutdown(instanceName) {
        if (instanceName) {
            const instance = SchemaKit.instances.get(instanceName);
            if (instance) {
                await instance.disconnect();
                SchemaKit.instances.delete(instanceName);
            }
        }
        else if (SchemaKit.defaultInstance) {
            await SchemaKit.defaultInstance.disconnect();
            SchemaKit.defaultInstance = null;
        }
    }
    /**
     * Shutdown all instances
     * @returns Promise<void>
     */
    static async shutdownAll() {
        // Shutdown all instances
        for (const [instanceName] of SchemaKit.instances) {
            await SchemaKit.shutdown(instanceName);
        }
        // Shutdown default instance
        await SchemaKit.shutdown();
    }
}
// Static instance management
SchemaKit.instances = new Map();
SchemaKit.defaultInstance = null;
//# sourceMappingURL=schemakit.js.map