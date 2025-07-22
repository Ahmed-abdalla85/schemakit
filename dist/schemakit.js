"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaKit = void 0;
const database_manager_1 = require("./database/database-manager");
const install_manager_1 = require("./database/install-manager");
const entity_1 = require("./entities/entity/entity");
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
     * Returns Entity instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name, tenantId = 'default') {
        if (!this.installManager) {
            throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return entity_1.Entity.create(name, tenantId, this.databaseManager);
    }
    /**
     * Access database manager for advanced operations
     */
    getDatabase() {
        return this.databaseManager;
    }
    /**
     * Access database manager for configuration management
     */
    getDatabaseManager() {
        return this.databaseManager;
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
        entity_1.Entity.clearCache(entityName, tenantId);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return entity_1.Entity.getCacheStats();
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