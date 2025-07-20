(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./core/install-manager", "./core/entity-builder", "./core/schema-loader", "./core/entity-manager", "./core/validation-manager", "./core/permission-manager", "./core/workflow-manager", "./core/query-manager", "./errors", "./database/adapters/postgres", "./database/adapters/sqlite", "./database/adapters/inmemory-simplified"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SchemaKit = void 0;
    const install_manager_1 = require("./core/install-manager");
    const entity_builder_1 = require("./core/entity-builder");
    const schema_loader_1 = require("./core/schema-loader");
    const entity_manager_1 = require("./core/entity-manager");
    const validation_manager_1 = require("./core/validation-manager");
    const permission_manager_1 = require("./core/permission-manager");
    const workflow_manager_1 = require("./core/workflow-manager");
    const query_manager_1 = require("./core/query-manager");
    const errors_1 = require("./errors");
    // Database adapters
    const postgres_1 = require("./database/adapters/postgres");
    const sqlite_1 = require("./database/adapters/sqlite");
    const inmemory_simplified_1 = require("./database/adapters/inmemory-simplified");
    class SchemaKit {
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
                const schemaLoader = new schema_loader_1.SchemaLoader(this.databaseAdapter);
                const entityManager = new entity_manager_1.EntityManager(this.databaseAdapter);
                const validationManager = new validation_manager_1.ValidationManager();
                const permissionManager = new permission_manager_1.PermissionManager(this.databaseAdapter);
                const workflowManager = new workflow_manager_1.WorkflowManager(this.databaseAdapter);
                const queryManager = new query_manager_1.QueryManager(this.databaseAdapter); // Future use
                this.installManager = new install_manager_1.InstallManager(this.databaseAdapter);
                this.entityBuilder = new entity_builder_1.EntityBuilder(schemaLoader, entityManager, validationManager, permissionManager, workflowManager);
                await this.installManager.ensureReady();
                return this;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to initialize SchemaKit: ${error.message}`);
            }
        }
        /**
         * Access entity proxy directly (fluent API)
         */
        entity(name) {
            if (!this.entityBuilder) {
                throw new errors_1.SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
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
                postgres: postgres_1.PostgresAdapter,
                sqlite: sqlite_1.SQLiteAdapter,
                inmemory: inmemory_simplified_1.InMemoryAdapter,
            };
            const AdapterClass = adapterMap[type.toLowerCase()] || inmemory_simplified_1.InMemoryAdapter;
            return new AdapterClass(config);
        }
    }
    exports.SchemaKit = SchemaKit;
});
//# sourceMappingURL=schemakit.js.map