"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaKit = void 0;
const database_manager_1 = require("./database/database-manager");
const install_manager_1 = require("./database/install-manager");
const entity_api_factory_1 = require("./entities/entity/entity-api-factory");
const errors_1 = require("./errors");
class SchemaKit {
    constructor(options = {}) {
        this.options = options;
        // Create database configuration from options
        const adapterConfig = options.adapter || {};
        const databaseConfig = {
            type: adapterConfig.type || 'inmemory-simplified',
            ...adapterConfig.config
        };
        this.databaseManager = new database_manager_1.DatabaseManager(databaseConfig);
    }
    /**
     * Initialize all services
     */
    async initialize() {
        try {
            await this.databaseManager.connect();
            // Initialize EntityAPIFactory with DatabaseManager (handles all manager creation)
            this.entityAPIFactory = new entity_api_factory_1.EntityAPIFactory(this.databaseManager);
            // Initialize system tables
            this.installManager = new install_manager_1.InstallManager(this.databaseManager.getAdapter());
            await this.installManager.ensureReady();
            return this;
        }
        catch (error) {
            throw new errors_1.SchemaKitError(`Failed to initialize SchemaKit: ${error.message}`);
        }
    }
    /**
     * Access entity with optional tenant context (unified API)
     * Returns EntityAPI instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name, tenantId = 'default') {
        if (!this.entityAPIFactory) {
            throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityAPIFactory.createEntityAPI(name, tenantId);
    }
    /**
     * Access database manager for advanced operations
     */
    getDatabase() {
        return this.databaseManager;
    }
    /**
     * Access entity manager for configuration management
     */
    getEntityManager() {
        if (!this.entityAPIFactory) {
            throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityAPIFactory.getEntityManager();
    }
    /**
     * Disconnect from database
     */
    async disconnect() {
        await this.databaseManager.disconnect();
    }
    /**
     * Clear cached entity definitions
     */
    clearEntityCache(entityName, tenantId) {
        this.getEntityManager()?.clearEntityCache(entityName);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.getEntityManager()?.getCacheStats() || { entityCacheSize: 0, entities: [] };
    }
    /**
     * Get connection information
     */
    getConnectionInfo() {
        return this.databaseManager.getConnectionInfo();
    }
    /**
     * Test database connection
     */
    async testConnection() {
        return this.databaseManager.testConnection();
    }
}
exports.SchemaKit = SchemaKit;
//# sourceMappingURL=schemakit.js.map