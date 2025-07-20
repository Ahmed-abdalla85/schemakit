import { EntityConfiguration, Context } from './types';
export interface SchemaKitOptions {
    adapter?: {
        type?: string;
        config?: Record<string, any>;
    };
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
    [key: string]: any;
}
/**
 * SchemaKit - Main class for entity management
 *
 * Simple API: schemaKit.entity('users').create(data)
 */
export declare class SchemaKit {
    private databaseAdapter;
    private options;
    private schemaLoader;
    private entityManager;
    private validationManager;
    private permissionManager;
    private queryManager;
    private workflowManager;
    private entityCache;
    private static instances;
    private static defaultInstance;
    /**
     * Create a new SchemaKit instance
     * @param options Configuration options
     */
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize SchemaKit
     * @returns Promise<SchemaKit>
     */
    init(): Promise<SchemaKit>;
    /**
     * Get entity object for CRUD operations
     * @param entityName Entity name
     * @returns Entity object with CRUD methods
     */
    entity(entityName: string): {
        create(data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
        read(filters?: Record<string, any>, context?: Context): Promise<any>;
        update(id: string | number, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
        delete(id: string | number, context?: Context): Promise<boolean>;
        findById(id: string | number, context?: Context): Promise<Record<string, any> | null>;
        readonly fields: Promise<any[]>;
        readonly workflows: Promise<any[]>;
        readonly schema: Promise<any>;
    };
    /**
     * Check if database is installed
     * @returns Promise<boolean>
     */
    isInstalled(): Promise<boolean>;
    /**
     * Install database schema
     * @returns Promise<void>
     */
    install(): Promise<void>;
    /**
     * Get database version
     * @returns Promise<string | null>
     */
    getVersion(): Promise<string | null>;
    /**
     * Reinstall database (drop and recreate)
     * @returns Promise<void>
     */
    reinstall(): Promise<void>;
    /**
     * Load entity configuration
     * @param entityName Entity name
     * @param context User context
     * @returns Promise<EntityConfiguration>
     */
    loadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Clear entity cache
     * @param entityName Optional entity name to clear specific entity
     */
    clearEntityCache(entityName?: string): void;
    /**
     * Disconnect from database
     * @returns Promise<void>
     */
    disconnect(): Promise<void>;
    /**
     * Create entity
     * @param entityName Entity name
     * @param data Entity data
     * @param context User context
     * @returns Promise<Record<string, any>>
     */
    private createEntity;
    /**
     * Read entities
     * @param entityName Entity name
     * @param filters Query filters
     * @param context User context
     * @returns Promise<any>
     */
    private readEntity;
    /**
     * Update entity
     * @param entityName Entity name
     * @param id Entity ID
     * @param data Entity data
     * @param context User context
     * @returns Promise<Record<string, any>>
     */
    private updateEntity;
    /**
     * Delete entity
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     * @returns Promise<boolean>
     */
    private deleteEntity;
    /**
     * Find entity by ID
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     * @returns Promise<Record<string, any> | null>
     */
    private findByIdEntity;
    /**
     * Get entity fields
     * @param entityName Entity name
     * @returns Promise<any[]>
     */
    private getEntityFields;
    /**
     * Get entity workflows
     * @param entityName Entity name
     * @returns Promise<any[]>
     */
    private getEntityWorkflows;
    /**
     * Get entity schema
     * @param entityName Entity name
     * @returns Promise<any>
     */
    private getEntitySchema;
    /**
     * Generate JSON schema from entity configuration
     * @param entityConfig Entity configuration
     * @returns JSON schema object
     */
    private generateJsonSchema;
    /**
     * Map field type to JSON schema type
     * @param type Field type
     * @returns JSON schema type
     */
    private mapFieldTypeToJsonSchema;
    /**
     * Create database adapter
     * @param type Adapter type
     * @param config Adapter configuration
     * @returns DatabaseAdapter
     */
    private createDatabaseAdapter;
    /**
     * Load schema file
     * @returns Promise<string>
     */
    private loadSchemaFile;
    /**
     * Load seed file
     * @returns Promise<string | null>
     */
    private loadSeedFile;
    /**
     * Initialize default SchemaKit instance
     * @param options Configuration options
     * @returns Promise<SchemaKit>
     */
    static initDefault(options: SchemaKitOptions): Promise<SchemaKit>;
    /**
     * Initialize named SchemaKit instance
     * @param instanceName Instance name
     * @param options Configuration options
     * @returns Promise<SchemaKit>
     */
    static init(instanceName: string, options: SchemaKitOptions): Promise<SchemaKit>;
    /**
     * Get default SchemaKit instance
     * @returns SchemaKit
     */
    static getDefault(): SchemaKit;
    /**
     * Get named SchemaKit instance
     * @param instanceName Instance name
     * @returns SchemaKit
     */
    static getInstance(instanceName: string): SchemaKit;
    /**
     * Clear entity cache
     * @param entityName Optional entity name
     * @param tenantId Optional tenant ID
     * @param instanceName Optional instance name
     */
    static clearEntityCache(entityName?: string, tenantId?: string, instanceName?: string): void;
    /**
     * Clear all caches
     */
    static clearAllCache(): void;
    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    static getCacheStats(): {
        entityCacheSize: number;
        instanceCacheSize: number;
        entities: string[];
        instances: string[];
    };
    /**
     * List all instances
     * @returns string[]
     */
    static listInstances(): string[];
    /**
     * Shutdown instance
     * @param instanceName Optional instance name
     * @returns Promise<void>
     */
    static shutdown(instanceName?: string): Promise<void>;
    /**
     * Shutdown all instances
     * @returns Promise<void>
     */
    static shutdownAll(): Promise<void>;
}
