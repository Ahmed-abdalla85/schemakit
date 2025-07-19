/**
 * SchemaLoader
 * Responsible for loading and caching entity configurations from the database
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context } from '../types';
/**
 * Cache statistics interface
 */
export interface CacheStats {
    entityCacheSize: number;
    entities: string[];
    hitRate?: number;
    missRate?: number;
}
/**
 * SchemaLoader class
 * Single responsibility: Load and cache entity configurations from database
 */
export declare class SchemaLoader {
    private databaseAdapter;
    private entityCache;
    private cacheEnabled;
    private cacheHits;
    private cacheMisses;
    /**
     * Create a new SchemaLoader instance
     * @param databaseAdapter Database adapter
     * @param options Options
     */
    constructor(databaseAdapter: DatabaseAdapter, options?: {
        cacheEnabled?: boolean;
    });
    /**
     * Load entity configuration
     * @param entityName Entity name
     * @param context User context
     * @returns Entity configuration
     */
    loadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Reload entity configuration (bypass cache)
     * @param entityName Entity name
     * @param context User context
     * @returns Entity configuration
     */
    reloadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Check if SchemaKit is installed
     * @returns True if installed
     */
    isSchemaKitInstalled(): Promise<boolean>;
    /**
     * Get SchemaKit version
     * @returns Version string
     */
    getVersion(): Promise<string>;
    /**
     * Ensure system tables exist
     */
    ensureSystemTables(): Promise<void>;
    /**
     * Reinstall SchemaKit
     * WARNING: This will delete all system tables and recreate them
     */
    reinstall(): Promise<void>;
    /**
     * Clear entity cache for a specific entity or all entities
     * @param entityName Optional entity name to clear
     */
    clearEntityCache(entityName?: string): void;
    /**
     * Clear all caches
     */
    clearAllCache(): void;
    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Get all loaded entities
     * @returns Array of entity names
     */
    getLoadedEntities(): string[];
    /**
     * Load entity definition
     * @param entityName Entity name
     * @returns Entity definition or null if not found
     * @private
     */
    private loadEntityDefinition;
    /**
     * Load entity fields
     * @param entityId Entity ID
     * @returns Array of field definitions
     * @private
     */
    private loadEntityFields;
    /**
     * Load entity permissions
     * @param entityId Entity ID
     * @param context User context
     * @returns Array of permission definitions
     * @private
     */
    private loadEntityPermissions;
    /**
     * Load entity views
     * @param entityId Entity ID
     * @returns Array of view definitions
     * @private
     */
    private loadEntityViews;
    /**
     * Load entity workflows
     * @param entityId Entity ID
     * @returns Array of workflow definitions
     * @private
     */
    private loadEntityWorkflows;
    /**
     * Load entity RLS (Row-Level Security)
     * @param entityId Entity ID
     * @param context User context
     * @returns Array of RLS definitions
     * @private
     */
    private loadEntityRLS;
    /**
     * Check if a table exists
     * @param tableName Table name
     * @returns True if table exists
     * @private
     */
    private tableExists;
    /**
     * Create a system table
     * @param tableName Table name
     * @private
     */
    private createSystemTable;
}
