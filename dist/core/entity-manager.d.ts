/**
 * EntityManager
 * Responsible for CRUD operations on entities and basic schema management
 *
 * Simplified: Uses InstallManager for system tables, focuses on core functionality
 * Enhanced: Uses DatabaseManager as the main database gateway
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
 * EntityManager class
 * Handles CRUD operations and schema management using existing patterns
 * Enhanced with EntityBuilder functionality and uses DatabaseManager as gateway
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
     * Returns a fluent EntityAPI instance for the given entity name with optional tenant context.
     * @param entityName Entity name
     * @param tenantId Tenant ID (defaults to 'default')
     */
    entity(entityName: string, tenantId?: string): any;
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
     * Reload entity configuration (bypass cache)
     */
    reloadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Check if SchemaKit is installed
     */
    isSchemaKitInstalled(): Promise<boolean>;
    /**
     * Get SchemaKit version
     */
    getVersion(): Promise<string>;
    /**
     * Ensure system tables exist - Only call during initialization
     */
    ensureSystemTables(): Promise<void>;
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
