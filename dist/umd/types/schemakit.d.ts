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
    entity(name: string): {
        create(data: Record<string, any>, context?: import("./types").Context): Promise<Record<string, any>>;
        read(filters?: Record<string, any>, context?: import("./types").Context): Promise<any>;
        update(id: string | number, data: Record<string, any>, context?: import("./types").Context): Promise<Record<string, any>>;
        delete(id: string | number, context?: import("./types").Context): Promise<boolean>;
        findById(id: string | number, context?: import("./types").Context): Promise<Record<string, any> | null>;
        readonly schema: Promise<any>;
        readonly fields: Promise<any>;
        readonly permissions: Promise<any>;
        readonly workflows: Promise<any>;
        readonly views: Promise<any>;
        clearCache(): void;
        reload(): Promise<void>;
    };
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
