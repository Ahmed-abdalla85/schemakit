/**
 * SchemaKit - Main API facade (Refactored)
 */
import { DatabaseAdapter } from './database/adapter';
import { SchemaKitError } from './errors';
import { SchemaLoader } from './core/schema-loader';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { QueryManager } from './core/query-manager';
import { WorkflowManager } from './core/workflow-manager';
/**
 * SchemaKit - Dynamic entity management system (Refactored)
 */
export class SchemaKit {
    /**
     * Create a new SchemaKit instance
     * @param options Configuration options
     */
    constructor(options = {}) {
        this.options = {
            adapter: {
                type: 'sqlite',
                config: {}
            },
            cache: {
                enabled: true,
                ttl: 3600000 // 1 hour
            },
            ...options
        };
        // We'll initialize the adapter in the init method
        this.databaseAdapter = null;
    }
    /**
     * Initialize SchemaKit
     * This method must be called before using any async methods
     */
    async init() {
        // Create database adapter asynchronously
        const adapterType = this.options.adapter?.type || 'sqlite';
        const adapterConfig = this.options.adapter?.config || {};
        this.databaseAdapter = await DatabaseAdapter.create(adapterType, adapterConfig);
        // Connect to the database
        await this.databaseAdapter.connect();
        // Initialize managers
        this.schemaLoader = new SchemaLoader(this.databaseAdapter, { cacheEnabled: this.options.cache?.enabled });
        this.entityManager = new EntityManager(this.databaseAdapter);
        this.validationManager = new ValidationManager();
        this.permissionManager = new PermissionManager(this.databaseAdapter);
        this.queryManager = new QueryManager(this.databaseAdapter);
        this.workflowManager = new WorkflowManager(this.databaseAdapter);
        return this;
    }
    /**
     * Check if SchemaKit is connected to the database
     * @returns True if connected, false otherwise
     */
    isConnected() {
        return this.databaseAdapter?.isConnected() || false;
    }
    /**
     * Check if SchemaKit is installed
     * @returns True if installed, false otherwise
     */
    async isInstalled() {
        return await this.schemaLoader.isSchemaKitInstalled();
    }
    /**
     * Get SchemaKit version
     * @returns Version string or null if not installed
     */
    async getVersion() {
        const version = await this.schemaLoader.getVersion();
        return version === 'unknown' ? null : version;
    }
    /**
     * Force reinstall SchemaKit (useful for development/testing)
     * This will recreate all system tables and seed data
     */
    async reinstall() {
        await this.schemaLoader.reinstall();
    }
    /**
     * Load entity configuration from database
     * @param entityName Entity name
     * @param context User context
     */
    async loadEntity(entityName, context = {}) {
        return this.schemaLoader.loadEntity(entityName, context);
    }
    /**
     * Reload entity configuration from database
     * @param entityName Entity name
     */
    async reloadEntity(entityName) {
        return this.schemaLoader.reloadEntity(entityName);
    }
    /**
     * Get loaded entity names
     */
    getLoadedEntities() {
        return this.schemaLoader.getLoadedEntities();
    }
    /**
     * Create a new entity instance
     * @param entityName Entity name
     * @param data Entity data
     * @param context User context
     */
    async create(entityName, data, context = {}) {
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
     * Find entity instance by ID
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     */
    async findById(entityName, id, context = {}) {
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
     * Update entity instance
     * @param entityName Entity name
     * @param id Entity ID
     * @param data Entity data
     * @param context User context
     */
    async update(entityName, id, data, context = {}) {
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
     * Delete entity instance
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     */
    async delete(entityName, id, context = {}) {
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
     * Find entity instances by view
     * @param entityName Entity name
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    async findByView(entityName, viewName, params = {}, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for reading ${entityName}`);
            }
            // Execute view using QueryManager
            return await this.queryManager.executeView(entityConfig, viewName, params, context);
        }
        catch (error) {
            throw new SchemaKitError(`Failed to execute view '${viewName}' for entity '${entityName}': ${error}`);
        }
    }
    /**
     * Execute custom query
     * @param entityName Entity name
     * @param queryBuilder Query builder function
     * @param context User context
     */
    async query(entityName, queryBuilder, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.loadEntity(entityName, context);
            // Check permission
            const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
            if (!hasPermission) {
                throw new SchemaKitError(`Permission denied for reading ${entityName}`);
            }
            // Execute custom query using QueryManager
            return await this.queryManager.executeCustomQuery(entityConfig, queryBuilder, context);
        }
        catch (error) {
            throw new SchemaKitError(`Failed to execute custom query for entity '${entityName}': ${error}`);
        }
    }
    /**
     * Execute view query
     * @param entityName Entity name
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    async executeView(entityName, viewName, params = {}, context = {}) {
        // This is essentially the same as findByView but with a different name for API consistency
        return this.findByView(entityName, viewName, params, context);
    }
    /**
     * Check if user has permission for action
     * @param entityName Entity name
     * @param action Action name
     * @param context User context
     */
    async checkPermission(entityName, action, context = {}) {
        try {
            // Load entity configuration (without using loadEntity to avoid circular dependency)
            const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
            // Check permission using PermissionManager
            return await this.permissionManager.checkPermission(entityConfig, action, context);
        }
        catch (error) {
            // If there's an error checking permissions, default to denying access
            console.error(`Error checking permission: ${error}`);
            return false;
        }
    }
    /**
     * Get entity permissions for user
     * @param entityName Entity name
     * @param context User context
     */
    async getEntityPermissions(entityName, context = {}) {
        try {
            // Load entity configuration
            const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
            // Get permissions using PermissionManager
            return await this.permissionManager.getEntityPermissions(entityConfig, context);
        }
        catch (error) {
            // If there's an error checking permissions, default to denying all access
            console.error(`Error getting entity permissions: ${error}`);
            return {
                create: false,
                read: false,
                update: false,
                delete: false,
                list: false
            };
        }
    }
    // ===== Static Factory Methods (EntityKit pattern) =====
    /**
     * Initialize default SchemaKit instance (EntityKit pattern)
     * @param options Configuration options
     */
    static async initDefault(options) {
        if (this.defaultInstance) {
            console.warn('Default SchemaKit instance already initialized. Replacing existing instance.');
        }
        const instance = new SchemaKit(options);
        await instance.init();
        this.defaultInstance = instance;
        return instance;
    }
    /**
     * Initialize named SchemaKit instance (EntityKit pattern)
     * @param instanceName Instance name
     * @param options Configuration options
     */
    static async init(instanceName, options) {
        if (this.instances.has(instanceName)) {
            console.warn(`SchemaKit instance '${instanceName}' already exists. Replacing existing instance.`);
        }
        const instance = new SchemaKit(options);
        await instance.init();
        this.instances.set(instanceName, instance);
        return instance;
    }
    /**
     * Get default SchemaKit instance (EntityKit pattern)
     */
    static getDefault() {
        if (!this.defaultInstance) {
            throw new SchemaKitError('Default SchemaKit instance not initialized. Call initDefault() first.');
        }
        return this.defaultInstance;
    }
    /**
     * Get named SchemaKit instance (EntityKit pattern)
     * @param instanceName Instance name
     */
    static getInstance(instanceName) {
        const instance = this.instances.get(instanceName);
        if (!instance) {
            throw new SchemaKitError(`SchemaKit instance '${instanceName}' not found. Call init('${instanceName}', options) first.`);
        }
        return instance;
    }
    /**
     * Get entity handler with automatic instance management (EntityKit pattern)
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     * @param instanceName Instance name (optional, uses default if not provided)
     */
    static async getEntity(entityName, tenantId, instanceName) {
        const instance = instanceName ? this.getInstance(instanceName) : this.getDefault();
        return await instance.getEntityHandler(entityName, tenantId);
    }
    /**
     * Get entity handler (alias for getEntity for compatibility)
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     * @param instanceName Instance name (optional)
     */
    static async getEntityHandler(entityName, tenantId, instanceName) {
        return this.getEntity(entityName, tenantId, instanceName);
    }
    /**
     * Clear entity cache for specific entity and tenant (EntityKit pattern)
     * @param entityName Entity name (optional)
     * @param tenantId Tenant identifier (optional)
     * @param instanceName Instance name (optional)
     */
    static clearEntityCache(entityName, tenantId, instanceName) {
        if (instanceName) {
            const instance = this.instances.get(instanceName);
            if (instance) {
                instance.clearEntityCache(entityName, tenantId);
            }
        }
        else if (this.defaultInstance) {
            this.defaultInstance.clearEntityCache(entityName, tenantId);
        }
    }
    /**
     * Clear all caches (EntityKit pattern)
     */
    static clearAllCache() {
        // Clear default instance cache
        if (this.defaultInstance) {
            this.defaultInstance.clearAllCache();
        }
        // Clear all named instance caches
        this.instances.forEach(instance => {
            instance.clearAllCache();
        });
    }
    /**
     * Get cache statistics (EntityKit pattern)
     */
    static getCacheStats() {
        const defaultStats = this.defaultInstance ? this.defaultInstance.getCacheStats() : { entityCacheSize: 0, entities: [] };
        let totalEntityCache = defaultStats.entityCacheSize;
        const allEntities = [...defaultStats.entities];
        // Add stats from named instances
        this.instances.forEach((instance, name) => {
            const stats = instance.getCacheStats();
            totalEntityCache += stats.entityCacheSize;
            allEntities.push(...stats.entities.map(entity => `${name}:${entity}`));
        });
        return {
            entityCacheSize: totalEntityCache,
            instanceCacheSize: this.instances.size + (this.defaultInstance ? 1 : 0),
            entities: allEntities,
            instances: ['default', ...Array.from(this.instances.keys())]
        };
    }
    /**
     * List all initialized instances
     */
    static listInstances() {
        const instances = Array.from(this.instances.keys());
        if (this.defaultInstance) {
            instances.unshift('default');
        }
        return instances;
    }
    /**
     * Shutdown specific instance
     * @param instanceName Instance name (optional, shuts down default if not provided)
     */
    static async shutdown(instanceName) {
        if (instanceName) {
            const instance = this.instances.get(instanceName);
            if (instance) {
                await instance.disconnect();
                this.instances.delete(instanceName);
            }
        }
        else if (this.defaultInstance) {
            await this.defaultInstance.disconnect();
            this.defaultInstance = null;
        }
    }
    /**
     * Shutdown all instances
     */
    static async shutdownAll() {
        // Shutdown default instance
        if (this.defaultInstance) {
            await this.defaultInstance.disconnect();
            this.defaultInstance = null;
        }
        // Shutdown all named instances
        const shutdownPromises = Array.from(this.instances.values()).map(instance => instance.disconnect());
        await Promise.all(shutdownPromises);
        this.instances.clear();
    }
    // ===== Instance methods for EntityKit pattern =====
    /**
     * Get entity handler for this instance
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     */
    async getEntityHandler(entityName, tenantId) {
        // Load entity configuration
        const entityConfig = await this.loadEntity(entityName, { tenantId });
        // Create and return unified entity handler
        const { UnifiedEntityHandler } = await import('./unified-entity-handler');
        return new UnifiedEntityHandler(this, entityConfig, tenantId);
    }
    /**
     * Clear entity cache for this instance
     * @param entityName Entity name (optional)
     * @param tenantId Tenant identifier (optional)
     */
    clearEntityCache(entityName, tenantId) {
        if (entityName) {
            // Clear specific entity cache
            const cacheKey = tenantId ? `${tenantId}:${entityName}` : entityName;
            this.schemaLoader.clearEntityCache(cacheKey);
        }
        else {
            // Clear all entity cache
            this.schemaLoader.clearAllCache();
        }
    }
    /**
     * Clear all caches for this instance
     */
    clearAllCache() {
        this.schemaLoader.clearAllCache();
    }
    /**
     * Get cache statistics for this instance
     */
    getCacheStats() {
        return this.schemaLoader.getCacheStats();
    }
    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.databaseAdapter && this.databaseAdapter.isConnected()) {
            await this.databaseAdapter.disconnect();
        }
    }
}
// ===== Static instance management (EntityKit pattern) =====
SchemaKit.instances = new Map();
SchemaKit.defaultInstance = null;
//# sourceMappingURL=schemakit.js.map