import { Context, EntityConfiguration } from './types';
import { QueryBuilder, QueryResult } from './core/query-manager';
/**
 * SchemaKit options
 */
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
 * SchemaKit - Dynamic entity management system (Refactored)
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
    private static instances;
    private static defaultInstance;
    /**
     * Create a new SchemaKit instance
     * @param options Configuration options
     */
    constructor(options?: SchemaKitOptions);
    /**
     * Initialize SchemaKit
     * This method must be called before using any async methods
     */
    init(): Promise<SchemaKit>;
    /**
     * Check if SchemaKit is connected to the database
     * @returns True if connected, false otherwise
     */
    isConnected(): boolean;
    /**
     * Check if SchemaKit is installed
     * @returns True if installed, false otherwise
     */
    isInstalled(): Promise<boolean>;
    /**
     * Get SchemaKit version
     * @returns Version string or null if not installed
     */
    getVersion(): Promise<string | null>;
    /**
     * Force reinstall SchemaKit (useful for development/testing)
     * This will recreate all system tables and seed data
     */
    reinstall(): Promise<void>;
    /**
     * Load entity configuration from database
     * @param entityName Entity name
     * @param context User context
     */
    loadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Reload entity configuration from database
     * @param entityName Entity name
     */
    reloadEntity(entityName: string): Promise<EntityConfiguration>;
    /**
     * Get loaded entity names
     */
    getLoadedEntities(): string[];
    /**
     * Create a new entity instance
     * @param entityName Entity name
     * @param data Entity data
     * @param context User context
     */
    create(entityName: string, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
    /**
     * Find entity instance by ID
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     */
    findById(entityName: string, id: string | number, context?: Context): Promise<Record<string, any> | null>;
    /**
     * Update entity instance
     * @param entityName Entity name
     * @param id Entity ID
     * @param data Entity data
     * @param context User context
     */
    update(entityName: string, id: string | number, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
    /**
     * Delete entity instance
     * @param entityName Entity name
     * @param id Entity ID
     * @param context User context
     */
    delete(entityName: string, id: string | number, context?: Context): Promise<boolean>;
    /**
     * Find entity instances by view
     * @param entityName Entity name
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    findByView(entityName: string, viewName: string, params?: Record<string, any>, context?: Context): Promise<QueryResult>;
    /**
     * Execute custom query
     * @param entityName Entity name
     * @param queryBuilder Query builder function
     * @param context User context
     */
    query(entityName: string, queryBuilder: (query: QueryBuilder) => QueryBuilder, context?: Context): Promise<QueryResult>;
    /**
     * Execute view query
     * @param entityName Entity name
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    executeView(entityName: string, viewName: string, params?: Record<string, any>, context?: Context): Promise<QueryResult>;
    /**
     * Check if user has permission for action
     * @param entityName Entity name
     * @param action Action name
     * @param context User context
     */
    checkPermission(entityName: string, action: string, context?: Context): Promise<boolean>;
    /**
     * Get entity permissions for user
     * @param entityName Entity name
     * @param context User context
     */
    getEntityPermissions(entityName: string, context?: Context): Promise<Record<string, boolean>>;
    /**
     * Initialize default SchemaKit instance (EntityKit pattern)
     * @param options Configuration options
     */
    static initDefault(options: SchemaKitOptions): Promise<SchemaKit>;
    /**
     * Initialize named SchemaKit instance (EntityKit pattern)
     * @param instanceName Instance name
     * @param options Configuration options
     */
    static init(instanceName: string, options: SchemaKitOptions): Promise<SchemaKit>;
    /**
     * Get default SchemaKit instance (EntityKit pattern)
     */
    static getDefault(): SchemaKit;
    /**
     * Get named SchemaKit instance (EntityKit pattern)
     * @param instanceName Instance name
     */
    static getInstance(instanceName: string): SchemaKit;
    /**
     * Get entity handler with automatic instance management (EntityKit pattern)
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     * @param instanceName Instance name (optional, uses default if not provided)
     */
    static getEntity(entityName: string, tenantId: string, instanceName?: string): Promise<import('./unified-entity-handler').UnifiedEntityHandler>;
    /**
     * Get entity handler (alias for getEntity for compatibility)
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     * @param instanceName Instance name (optional)
     */
    static getEntityHandler(entityName: string, tenantId: string, instanceName?: string): Promise<import('./unified-entity-handler').UnifiedEntityHandler>;
    /**
     * Clear entity cache for specific entity and tenant (EntityKit pattern)
     * @param entityName Entity name (optional)
     * @param tenantId Tenant identifier (optional)
     * @param instanceName Instance name (optional)
     */
    static clearEntityCache(entityName?: string, tenantId?: string, instanceName?: string): void;
    /**
     * Clear all caches (EntityKit pattern)
     */
    static clearAllCache(): void;
    /**
     * Get cache statistics (EntityKit pattern)
     */
    static getCacheStats(): {
        entityCacheSize: number;
        instanceCacheSize: number;
        entities: string[];
        instances: string[];
    };
    /**
     * List all initialized instances
     */
    static listInstances(): string[];
    /**
     * Shutdown specific instance
     * @param instanceName Instance name (optional, shuts down default if not provided)
     */
    static shutdown(instanceName?: string): Promise<void>;
    /**
     * Shutdown all instances
     */
    static shutdownAll(): Promise<void>;
    /**
     * Get entity handler for this instance
     * @param entityName Entity name
     * @param tenantId Tenant identifier
     */
    getEntityHandler(entityName: string, tenantId: string): Promise<import('./unified-entity-handler').UnifiedEntityHandler>;
    /**
     * Clear entity cache for this instance
     * @param entityName Entity name (optional)
     * @param tenantId Tenant identifier (optional)
     */
    clearEntityCache(entityName?: string, tenantId?: string): void;
    /**
     * Clear all caches for this instance
     */
    clearAllCache(): void;
    /**
     * Get cache statistics for this instance
     */
    getCacheStats(): {
        entityCacheSize: number;
        entities: string[];
    };
    /**
     * Disconnect from database
     */
    disconnect(): Promise<void>;
}
