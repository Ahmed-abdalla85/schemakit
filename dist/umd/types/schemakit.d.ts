import { Context, EntityConfiguration, QueryResult } from './types';
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
 * SchemaKit - Dynamic entity management system
 */
export declare class SchemaKit {
    private databaseAdapter;
    private options;
    private entityCache;
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
     * Ensure system tables exist
     * @private
     */
    private ensureSystemTables;
    /**
     * Load entity definition from database
     * @param entityName Entity name
     * @private
     */
    private loadEntityDefinition;
    /**
     * Load entity fields from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityFields;
    /**
     * Load entity permissions from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    private loadEntityPermissions;
    /**
     * Load entity views from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityViews;
    /**
     * Load entity workflows from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityWorkflows;
    /**
     * Load entity RLS (Row Level Security) from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    private loadEntityRLS;
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
     * Validate entity data against schema
     * @param entityConfig Entity configuration
     * @param data Data to validate
     * @param operation Operation type (create, update)
     * @private
     */
    private validateEntityData;
    /**
     * Prepare data for insertion
     * @param entityConfig Entity configuration
     * @param data Data to prepare
     * @private
     */
    private prepareDataForInsert;
    /**
     * Process entity result from database
     * @param entityConfig Entity configuration
     * @param data Data from database
     * @private
     */
    private processEntityResult;
    /**
     * Generate a unique ID
     * @private
     */
    private generateId;
    /**
     * Ensure entity table exists
     * @param entityConfig Entity configuration
     * @private
     */
    private ensureEntityTable;
    /**
     * Build RLS (Row Level Security) conditions
     * @param entityConfig Entity configuration
     * @param context User context
     * @private
     */
    private buildRLSConditions;
    /**
     * Execute workflows for an entity
     * @param entityConfig Entity configuration
     * @param event Trigger event
     * @param oldData Old data (for update/delete)
     * @param newData New data (for create/update)
     * @param context User context
     * @private
     */
    private executeWorkflows;
    /**
     * Find entity instances by view
     * @param entityName Entity name
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    findByView(entityName: string, viewName: string, params?: Record<string, any>, context?: Context): Promise<QueryResult>;
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
     * Prepare data for update
     * @param entityConfig Entity configuration
     * @param data Data to prepare
     * @private
     */
    private prepareDataForUpdate;
    /**
     * Execute custom query
     * @param entityName Entity name
     * @param queryBuilder Query builder function
     * @param context User context
     */
    query(entityName: string, queryBuilder: (query: any) => any, context?: Context): Promise<QueryResult>;
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
