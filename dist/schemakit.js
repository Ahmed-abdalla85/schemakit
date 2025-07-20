import { InstallManager } from './core/install-manager';
import { EntityBuilder } from './core/entity-builder';
import { SchemaLoader } from './core/schema-loader';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { WorkflowManager } from './core/workflow-manager';
import { QueryManager } from './core/query-manager';
import { SchemaKitError } from './errors';
// Database adapters
import { PostgresAdapter } from './database/adapters/postgres';
import { SQLiteAdapter } from './database/adapters/sqlite';
import { InMemoryAdapter } from './database/adapters/inmemory-simplified';
export class SchemaKit {
    constructor(options = {}) {
        this.options = options;
        const type = options.adapter?.type || 'inmemory';
        const config = options.adapter?.config || {};
        this.databaseAdapter = this.createDatabaseAdapter(type, config);
    }
    /**
     * Initialize all services
     */
    async initialize() {
        try {
            await this.databaseAdapter.connect();
            const schemaLoader = new SchemaLoader(this.databaseAdapter);
            const entityManager = new EntityManager(this.databaseAdapter);
            const validationManager = new ValidationManager();
            const permissionManager = new PermissionManager(this.databaseAdapter);
            const workflowManager = new WorkflowManager(this.databaseAdapter);
            const queryManager = new QueryManager(this.databaseAdapter); // Future use
            this.installManager = new InstallManager(this.databaseAdapter);
            this.entityBuilder = new EntityBuilder(schemaLoader, entityManager, validationManager, permissionManager, workflowManager);
            await this.installManager.ensureReady();
            return this;
        }
        catch (error) {
            throw new SchemaKitError(`Failed to initialize SchemaKit: ${error.message}`);
        }
    }
    /**
     * Access entity proxy directly (fluent API)
     */
    entity(name) {
        if (!this.entityBuilder) {
            throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
        }
        return this.entityBuilder.entity(name);
    }
    /**
     * Disconnect from database
     */
    async disconnect() {
        await this.databaseAdapter.disconnect();
    }
    /**
     * Clear cached entity definitions
     */
    clearEntityCache(entityName) {
        this.entityBuilder?.clearEntityCache(entityName);
    }
    getCacheStats() {
        return this.entityBuilder?.getCacheStats() || { entityCacheSize: 0, entities: [] };
    }
    /**
     * Create appropriate DB adapter
     */
    createDatabaseAdapter(type, config) {
        const adapterMap = {
            postgres: PostgresAdapter,
            sqlite: SQLiteAdapter,
            inmemory: InMemoryAdapter,
        };
        const AdapterClass = adapterMap[type.toLowerCase()] || InMemoryAdapter;
        return new AdapterClass(config);
    }
}
//# sourceMappingURL=schemakit.js.map