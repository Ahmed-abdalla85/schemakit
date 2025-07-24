import { SchemaKitOptions } from './types';
import { Entity } from './entities/entity/entity';
export declare class SchemaKit {
    private readonly options;
    private readonly db;
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize all services
     */
    initialize(): Promise<this>;
    /**
     * Get or create an Entity instance
     * Returns Entity instance - the standalone gateway for entity operations
     * @param name Entity name
     * @param tenantId Tenant identifier (defaults to 'default')
     */
    entity(name: string, tenantId?: string): Promise<Entity>;
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
    static clearCache(entityName?: string, tenantId?: string): void;
    static getCacheStats(): {
        size: number;
        entities: string[];
    };
}
