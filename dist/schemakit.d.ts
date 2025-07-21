import { SchemaKitOptions } from './types';
import { DatabaseManager } from './database/database-manager';
export declare class SchemaKit {
    private readonly options;
    private readonly databaseManager;
    private installManager?;
    private entityManager?;
    private validationManager?;
    private permissionManager?;
    private workflowManager?;
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize all services
     */
    initialize(): Promise<this>;
    /**
     * Access entity with optional tenant context (unified API)
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name: string, tenantId?: string): any;
    /**
     * Access database manager for advanced operations
     */
    getDatabase(): DatabaseManager;
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
        entityCacheSize: number;
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
