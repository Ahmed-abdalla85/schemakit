/**
 * Permission Manager - Handles permissions and row-level security
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration } from '../types';
/**
 * Permission Manager class
 */
export declare class PermissionManager {
    private databaseAdapter;
    constructor(databaseAdapter: DatabaseAdapter);
    /**
     * Check if user has permission for action
     * @param entityConfig Entity configuration
     * @param action Action name
     * @param context User context
     */
    checkPermission(entityConfig: EntityConfiguration, action: string, context?: Context): Promise<boolean>;
    /**
     * Get entity permissions for user
     * @param entityConfig Entity configuration
     * @param context User context
     */
    getEntityPermissions(entityConfig: EntityConfiguration, context?: Context): Promise<Record<string, boolean>>;
    /**
     * Build RLS (Row Level Security) conditions
     * @param entityConfig Entity configuration
     * @param context User context
     */
    buildRLSConditions(entityConfig: EntityConfiguration, context: Context): {
        sql: string;
        params: any[];
    };
    /**
     * Check field-level permissions
     * @param entityConfig Entity configuration
     * @param fieldName Field name
     * @param action Action (read, write)
     * @param context User context
     */
    checkFieldPermission(entityConfig: EntityConfiguration, fieldName: string, action: 'read' | 'write', context?: Context): boolean;
    /**
     * Filter fields based on permissions
     * @param entityConfig Entity configuration
     * @param data Data object
     * @param action Action (read, write)
     * @param context User context
     */
    filterFieldsByPermissions(entityConfig: EntityConfiguration, data: Record<string, any>, action: 'read' | 'write', context?: Context): Record<string, any>;
}
