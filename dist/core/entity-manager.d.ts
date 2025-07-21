/**
 * EntityManager
 * Responsible for CRUD operations on entities and schema management
 *
 * Phase 2 Refactoring: Delegates query building to QueryManager
 * Phase 3 Refactoring: Integrated SchemaLoader functionality
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context, RLSConditions } from '../types';
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
 * EntityManager class
 * Single responsibility: Handle CRUD operations on entities and schema management
 */
export declare class EntityManager {
    private databaseAdapter;
    private queryManager;
    private entityCache;
    private cacheEnabled;
    private cacheHits;
    private cacheMisses;
    /**
     * Create a new EntityManager instance
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
     * Create a new entity record
     * @param entityConfig Entity configuration
     * @param data Entity data
     * @param context User context
     * @returns Created entity record
     */
    create(entityConfig: EntityConfiguration, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
    /**
     * Find entity record by ID
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Entity record or null if not found
     */
    findById(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any> | null>;
    /**
     * Update entity record
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param data Update data
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Updated entity record
     */
    update(entityConfig: EntityConfiguration, id: string | number, data: Record<string, any>, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any>>;
    /**
     * Delete entity record
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns True if record was deleted
     */
    delete(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: RLSConditions): Promise<boolean>;
    /**
     * Find entity records with conditions
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param options Query options
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Array of entity records
     */
    find(entityConfig: EntityConfiguration, conditions?: any[], options?: {
        fields?: string[];
        sort?: {
            field: string;
            direction: 'ASC' | 'DESC';
        }[];
        limit?: number;
        offset?: number;
    }, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any>[]>;
    /**
     * Count entity records with conditions
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Count of records
     */
    count(entityConfig: EntityConfiguration, conditions?: any[], context?: Context, rlsConditions?: RLSConditions): Promise<number>;
    /**
     * Ensure entity table exists
     * @param entityConfig Entity configuration
     */
    ensureEntityTable(entityConfig: EntityConfiguration): Promise<void>;
    /**
     * Create entity table
     * @param entityConfig Entity configuration
     */
    private createEntityTable;
    /**
     * Update entity table with new fields
     * @param entityConfig Entity configuration
     */
    private updateEntityTable;
    /**
     * Get SQL type for field type
     * @param fieldType Field type
     * @returns SQL type
     */
    private getSqlType;
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
