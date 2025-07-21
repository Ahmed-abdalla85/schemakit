/**
 * EntityManager - Data Access Layer
 * Responsible for entity configuration management and data access operations
 *
 * This is the data layer that EntityAPI uses for:
 * - Loading entity configurations
 * - Managing entity cache
 * - Providing database access
 * - Creating EntityAPI instances
 */
import { DatabaseManager } from '../database/database-manager';
import { FluentQueryBuilder } from '../database/fluent-query-builder';
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
 * EntityManager class - Data Access Layer
 *
 * Responsibilities:
 * - Entity configuration loading and caching
 * - EntityAPI instance creation and management
 * - Database access provision
 * - Schema management
 *
 * Note: Business logic (validation, permissions, workflows) is handled by EntityAPI
 */
export declare class EntityManager {
    private databaseManager;
    private queryManager;
    private installManager;
    private entityCache;
    private entityApiCache;
    private cacheEnabled;
    private cacheHits;
    private cacheMisses;
    /**
     * Create a new EntityManager instance
     * @param databaseManager Database manager
     * @param options Options
     */
    constructor(databaseManager: DatabaseManager, options?: {
        cacheEnabled?: boolean;
    });
    /**
     * Create a fluent query builder for a table
     * @param tableName Table name
     * @param tenantId Tenant ID
     * @returns FluentQueryBuilder instance
     */
    db(tableName: string, tenantId?: string): FluentQueryBuilder;
    /**
     * Get table reference for fluent queries
     * @param tableName Table name
     * @param tenantId Tenant ID
     * @returns FluentQueryBuilder instance
     */
    table(tableName: string, tenantId?: string): FluentQueryBuilder;
    /**
     * Get database manager for advanced operations
     */
    getDatabaseManager(): DatabaseManager;
    /**
     * Create EntityAPI instance for the given entity name with optional tenant context.
     * This is the factory method that should be called by SchemaKit, not a business logic method.
     * @param entityName Entity name
     * @param tenantId Tenant ID (defaults to 'default')
     */
    createEntityAPI(entityName: string, tenantId?: string): any;
    /**
     * Clears the entity API cache for a specific entity or all entities.
     */
    clearEntityApiCache(entityName?: string, tenantId?: string): void;
    /**
     * Load entity configuration
     * @param entityName Entity name
     * @param context User context
     * @returns Entity configuration
     */
    loadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Raw data insertion - used by EntityAPI
     * @param entityConfig Entity configuration
     * @param data Entity data
     * @param context User context
     * @returns Created entity record
     */
    insertData(entityConfig: EntityConfiguration, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
    /**
     * Raw data retrieval by ID - used by EntityAPI
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Entity record or null if not found
     */
    findByIdData(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any> | null>;
    /**
     * Raw data update - used by EntityAPI
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param data Update data
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Updated entity record
     */
    updateData(entityConfig: EntityConfiguration, id: string | number, data: Record<string, any>, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any>>;
    /**
     * Raw data deletion - used by EntityAPI
     * @param entityConfig Entity configuration
     * @param id Record ID
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns True if record was deleted
     */
    deleteData(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: RLSConditions): Promise<boolean>;
    /**
     * Raw data finding with conditions - used by EntityAPI
     * @param entityConfig Entity configuration
     * @param conditions Query conditions
     * @param options Query options
     * @param context User context
     * @param rlsConditions RLS conditions (optional)
     * @returns Array of entity records
     */
    findData(entityConfig: EntityConfiguration, conditions?: any[], options?: {
        fields?: string[];
        sort?: {
            field: string;
            direction: 'ASC' | 'DESC';
        }[];
        limit?: number;
        offset?: number;
    }, context?: Context, rlsConditions?: RLSConditions): Promise<Record<string, any>[]>;
    /**
     * Reinstall SchemaKit
     */
    reinstall(): Promise<void>;
    /**
     * Clear entity cache
     */
    clearEntityCache(entityName?: string, tenantId?: string): void;
    /**
     * Clear all caches
     */
    clearAllCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Get all loaded entities
     */
    getLoadedEntities(): string[];
    /**
     * Ensure entity table exists
     */
    private ensureEntityTable;
    /**
     * Get SQL type for field type
     */
    private getSqlType;
    private loadEntityDefinition;
    private loadEntityFields;
    private loadEntityPermissions;
    private loadEntityViews;
    private loadEntityWorkflows;
    private loadEntityRLS;
}
