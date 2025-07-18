/**
 * Entity Manager - Handles CRUD operations for entities
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration } from '../types';
/**
 * Entity Manager class
 */
export declare class EntityManager {
    private databaseAdapter;
    private validationManager;
    private workflowManager;
    constructor(databaseAdapter: DatabaseAdapter);
    /**
     * Create a new entity instance
     * @param entityConfig Entity configuration
     * @param data Entity data
     * @param context User context
     */
    create(entityConfig: EntityConfiguration, data: Record<string, any>, context?: Context): Promise<Record<string, any>>;
    /**
     * Find entity instance by ID
     * @param entityConfig Entity configuration
     * @param id Entity ID
     * @param context User context
     * @param rlsConditions RLS conditions to apply
     */
    findById(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: {
        sql: string;
        params: any[];
    }): Promise<Record<string, any> | null>;
    /**
     * Update entity instance
     * @param entityConfig Entity configuration
     * @param id Entity ID
     * @param data Entity data
     * @param context User context
     * @param rlsConditions RLS conditions to apply
     */
    update(entityConfig: EntityConfiguration, id: string | number, data: Record<string, any>, context?: Context, rlsConditions?: {
        sql: string;
        params: any[];
    }): Promise<Record<string, any>>;
    /**
     * Delete entity instance
     * @param entityConfig Entity configuration
     * @param id Entity ID
     * @param context User context
     * @param rlsConditions RLS conditions to apply
     */
    delete(entityConfig: EntityConfiguration, id: string | number, context?: Context, rlsConditions?: {
        sql: string;
        params: any[];
    }): Promise<boolean>;
    /**
     * Ensure entity table exists
     * @param entityConfig Entity configuration
     * @private
     */
    private ensureEntityTable;
    /**
     * Generate a unique ID
     * @private
     */
    private generateId;
}
