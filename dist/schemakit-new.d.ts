import { Context, EntityConfiguration, QueryResult } from './types';
import { QueryBuilder } from './core/query-builder';
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
    private permissionManager;
    private queryManager;
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
}
