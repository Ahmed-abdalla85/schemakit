import { DatabaseManager } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { WorkflowManager } from './core/workflow-manager';
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
            // Initialize managers with DatabaseManager
            this.entityManager = new EntityManager(this.databaseManager);
            this.validationManager = new ValidationManager();
            this.permissionManager = new PermissionManager(this.databaseManager.getAdapter());
            this.workflowManager = new WorkflowManager(this.databaseManager.getAdapter());
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
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name, tenantId = 'default') {
        if (!this.entityManager) {
            throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityManager.entity(name, tenantId);
    }
    /**
     * Access database manager for advanced operations
     */
    getDatabase() {
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
        this.entityManager?.clearEntityCache(entityName, tenantId);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.entityManager?.getCacheStats() || { entityCacheSize: 0, entities: [] };
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