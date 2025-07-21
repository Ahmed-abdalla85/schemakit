import { SchemaKitOptions } from './types';
import { DatabaseManager } from './database/database-manager';
import { UnifiedEntityFactory } from './entities/unified';
export declare class SchemaKit {
    private readonly options;
    private readonly databaseManager;
    private installManager?;
    private entityFactory?;
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize all services
     */
    initialize(): Promise<this>;
    /**
     * Access entity with optional tenant context (unified API)
     * Returns UnifiedEntityHandler instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name: string, tenantId?: string): Promise<import("./entities/unified").UnifiedEntityHandler>;
    /**
     * Access database manager for advanced operations
     */
    getDatabase(): DatabaseManager;
    /**
     * Access entity factory for handler creation and cache management
     */
    getEntityFactory(): UnifiedEntityFactory;
    /**
     * Disconnect from database
     */
    disconnect(): Promise<void>;
    /**
     * Clear cached entity handlers
     */
    clearEntityCache(entityName?: string, tenantId?: string): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        handlerCacheSize: number;
        cachedEntities: string[];
    };
    /**
     * Get connection information
     */
    getConnectionInfo(): import("./database/database-manager").ConnectionInfo;
    /**
     * Test database connection
     */
    testConnection(): Promise<boolean>;
}
