(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./database/adapter", "./errors", "./core/schema-loader", "./core/entity-manager", "./core/permission-manager", "./core/query-builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SchemaKit = void 0;
    /**
     * SchemaKit - Main API facade (Refactored)
     */
    const adapter_1 = require("./database/adapter");
    const errors_1 = require("./errors");
    const schema_loader_1 = require("./core/schema-loader");
    const entity_manager_1 = require("./core/entity-manager");
    const permission_manager_1 = require("./core/permission-manager");
    const query_builder_1 = require("./core/query-builder");
    /**
     * SchemaKit - Dynamic entity management system (Refactored)
     */
    class SchemaKit {
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
            this.databaseAdapter = await adapter_1.DatabaseAdapter.create(adapterType, adapterConfig);
            // Connect to the database
            await this.databaseAdapter.connect();
            // Initialize managers
            this.schemaLoader = new schema_loader_1.SchemaLoader(this.databaseAdapter, this.options);
            this.entityManager = new entity_manager_1.EntityManager(this.databaseAdapter);
            this.permissionManager = new permission_manager_1.PermissionManager(this.databaseAdapter);
            this.queryManager = new query_builder_1.QueryManager(this.databaseAdapter);
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
                    throw new errors_1.SchemaKitError(`Permission denied for creating ${entityName}`);
                }
                // Create entity using EntityManager
                return await this.entityManager.create(entityConfig, data, context);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to create ${entityName}: ${error}`);
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
                    throw new errors_1.SchemaKitError(`Permission denied for reading ${entityName}`);
                }
                // Apply RLS conditions
                const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
                // Find entity using EntityManager
                return await this.entityManager.findById(entityConfig, id, context, rlsConditions);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to find ${entityName} with id ${id}: ${error}`);
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
                    throw new errors_1.SchemaKitError(`Permission denied for updating ${entityName}`);
                }
                // Apply RLS conditions
                const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
                // Update entity using EntityManager
                return await this.entityManager.update(entityConfig, id, data, context, rlsConditions);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to update ${entityName} with id ${id}: ${error}`);
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
                    throw new errors_1.SchemaKitError(`Permission denied for deleting ${entityName}`);
                }
                // Apply RLS conditions
                const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
                // Delete entity using EntityManager
                return await this.entityManager.delete(entityConfig, id, context, rlsConditions);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to delete ${entityName} with id ${id}: ${error}`);
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
                    throw new errors_1.SchemaKitError(`Permission denied for reading ${entityName}`);
                }
                // Execute view using QueryManager
                return await this.queryManager.executeView(entityConfig, viewName, params, context);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to execute view '${viewName}' for entity '${entityName}': ${error}`);
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
                    throw new errors_1.SchemaKitError(`Permission denied for reading ${entityName}`);
                }
                // Execute custom query using QueryManager
                return await this.queryManager.executeCustomQuery(entityConfig, queryBuilder, context);
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to execute custom query for entity '${entityName}': ${error}`);
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
    }
    exports.SchemaKit = SchemaKit;
});
//# sourceMappingURL=schemakit-new.js.map