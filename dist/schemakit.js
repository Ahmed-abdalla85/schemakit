import { DatabaseManager } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { EntityAPIFactory } from './entities/entity/entity-api-factory';
import { SchemaKitError } from './errors';
export class SchemaKit {
    constructor(options = {}) {
        this.options = options;
        // Create database configuration from options
        const adapterConfig = options.adapter || {};
        const databaseConfig = {
            type: adapterConfig.type || 'inmemory-simplified',
            ...adapterConfig.config
        };
        this.databaseManager = new DatabaseManager(databaseConfig);
    }
    /**
     * Initialize all services
     */
    async initialize() {
        try {
            await this.databaseManager.connect();
            // Initialize EntityAPIFactory with DatabaseManager (handles all manager creation)
            this.entityAPIFactory = new EntityAPIFactory(this.databaseManager);
            // Initialize system tables
            this.installManager = new InstallManager(this.databaseManager.getAdapter());
            await this.installManager.ensureReady();
            return this;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to initialize SchemaKit: ${error.message}`);
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
            throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
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
            throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
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
//# sourceMappingURL=schemakit.js.map