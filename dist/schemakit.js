"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaKit = void 0;
const db_1 = require("./database/db");
const entity_1 = require("./entities/entity/entity");
class SchemaKit {
    constructor(options = {}) {
        this.options = options;
        const adapterConfig = options.adapter || {};
        // Allow tenantId in config, but fallback to 'system'
        this.db = new db_1.DB({
            adapter: adapterConfig.type || 'inmemory',
            tenantId: adapterConfig.tenantId || 'system',
            config: adapterConfig.config || {}
        });
    }
    /**
     * Initialize all services
     */
    async initialize() {
        // No-op for now; could connect DB if needed
        return this;
    }
    /**
     * Get or create an Entity instance
     * Returns Entity instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    async entity(name, tenantId = 'default') {
        const entity = entity_1.Entity.create(name, tenantId, this.db);
        await entity.initialize();
        return entity;
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
    static clearCache(entityName, tenantId) {
        entity_1.Entity.clearCache(entityName, tenantId);
    }
    static getCacheStats() {
        return entity_1.Entity.getCacheStats();
    }
}
exports.SchemaKit = SchemaKit;
//# sourceMappingURL=schemakit.js.map