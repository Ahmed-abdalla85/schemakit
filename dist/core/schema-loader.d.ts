/**
 * Schema Loader - Handles entity configuration loading and caching
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration } from '../types';
export interface SchemaLoaderOptions {
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
}
/**
 * Schema Loader class
 */
export declare class SchemaLoader {
    private databaseAdapter;
    private options;
    private entityCache;
    constructor(databaseAdapter: DatabaseAdapter, options?: SchemaLoaderOptions);
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
}
