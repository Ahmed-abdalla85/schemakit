import { SchemaKitOptions } from './types';
export declare class SchemaKit {
    private readonly options;
    private readonly databaseAdapter;
    private installManager?;
    private entityBuilder?;
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize all services
     */
    initialize(): Promise<this>;
    /**
     * Access entity proxy directly (fluent API)
     */
    entity(name: string): import("./core/entity-api").EntityAPI;
    /**
     * Disconnect from database
     */
    disconnect(): Promise<void>;
    /**
     * Clear cached entity definitions
     */
    clearEntityCache(entityName?: string): void;
    getCacheStats(): {
        entityCacheSize: number;
        entities: string[];
    };
    /**
     * Create appropriate DB adapter
     */
    private createDatabaseAdapter;
}
