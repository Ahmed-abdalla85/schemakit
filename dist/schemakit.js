"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaKit = void 0;
const database_manager_1 = require("./database/database-manager");
const install_manager_1 = require("./database/install-manager");
const unified_1 = require("./entities/unified");
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
            // Initialize UnifiedEntityFactory with DatabaseAdapter
            this.entityFactory = new unified_1.UnifiedEntityFactory(this.databaseManager.getAdapter(), {
                cacheEnabled: this.options.cache?.enabled !== false,
                tenantId: 'default'
            });
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
     * Returns UnifiedEntityHandler instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    async entity(name, tenantId = 'default') {
        if (!this.entityFactory) {
            throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityFactory.createHandler(name, tenantId);
    }
    /**
     * Access database manager for advanced operations
     */
    getDatabase() {
        return this.databaseManager;
    }
    /**
     * Access entity factory for handler creation and cache management
     */
    getEntityFactory() {
        if (!this.entityFactory) {
            throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityFactory;
    }
    /**
     * Disconnect from database
     */
    async disconnect() {
        await this.databaseManager.disconnect();
    }
    /**
     * Clear cached entity handlers
     */
    clearEntityCache(entityName, tenantId) {
        this.getEntityFactory()?.clearCache(entityName, tenantId);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.getEntityFactory()?.getCacheStats() || { handlerCacheSize: 0, cachedEntities: [] };
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