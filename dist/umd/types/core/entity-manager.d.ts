/**
 * EntityManager
 * Responsible for CRUD operations on entities
 *
 * Phase 2 Refactoring: Delegates query building to QueryManager
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context, RLSConditions } from '../types';
/**
 * EntityManager class
 * Single responsibility: Handle CRUD operations on entities
 */
export declare class EntityManager {
    private databaseAdapter;
    private queryManager;
    /**
     * Create a new EntityManager instance
     * @param databaseAdapter Database adapter
     */
    constructor(databaseAdapter: DatabaseAdapter);
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
}
