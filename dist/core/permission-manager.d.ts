/**
 * PermissionManager
 * Responsible for handling permissions and RLS
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context, RLSConditions } from '../types';
/**
 * PermissionManager class
 * Single responsibility: Handle permissions and RLS
 */
export declare class PermissionManager {
    private databaseAdapter;
    /**
     * Create a new PermissionManager instance
     * @param databaseAdapter Database adapter
     */
    constructor(databaseAdapter: DatabaseAdapter);
    /**
     * Check if user has permission for action
     * @param entityConfig Entity configuration
     * @param action Action name
     * @param context User context
     * @returns True if user has permission
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
     * @returns RLS conditions
     */
    buildRLSConditions(entityConfig: EntityConfiguration, context: Context): RLSConditions;
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
     * @returns Filtered data object
     */
    filterFieldsByPermissions(entityConfig: EntityConfiguration, data: Record<string, any>, action: 'read' | 'write', context?: Context): Record<string, any>;
    /**
     * Evaluate permission conditions
     * @param conditions Permission conditions
     * @param context User context
     * @returns True if conditions are met
     * @private
     */
    private evaluatePermissionConditions;
    /**
     * Evaluate a single condition
     * @param condition Single condition object
     * @param context User context
     * @returns True if condition is met
     * @private
     */
    private evaluateSingleCondition;
}
