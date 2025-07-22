import { SchemaKitOptions } from './types';
import { DatabaseManager } from './database/database-manager';
import { Entity } from './entities/entity/entity';
export declare class SchemaKit {
    private readonly options;
    private readonly databaseManager;
    private installManager?;
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize all services
     */
    initialize(): Promise<this>;
    /**
     * Access entity with optional tenant context (unified API)
     * Returns Entity instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name: string, tenantId?: string): Entity;
    /**
     * Access database manager for advanced operations
     */
    getDatabase(): DatabaseManager;
    /**
     * Access database manager for configuration management
     */
    getDatabaseManager(): DatabaseManager;
    /**
     * Disconnect from database
     */
    disconnect(): Promise<void>;
    /**
     * Clear cached entity definitions
     */
    clearEntityCache(entityName?: string, tenantId?: string): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        entities: string[];
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
