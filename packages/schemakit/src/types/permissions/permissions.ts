/**
 * Permission and authorization types
 * 
 * These types define role-based access control (RBAC) and field-level
 * permissions for entities in SchemaKit.
 * 
 * @since 0.1.0
 */

import { OperationType } from '../core/common';

/**
 * Permission rule for entity access control
 * 
 * Stored in the `system_permissions` table, defines what roles can perform
 * which operations on entities, with optional conditions and field restrictions.
 * 
 * @example
 * ```typescript
 * // Basic permission - managers can read customer records
 * const permission: PermissionDefinition = {
 *   id: 'perm_001',
 *   entity_id: 'ent_customers_001',
 *   role: 'manager',
 *   action: 'read',
 *   is_allowed: true,
 *   created_at: '2024-01-01T00:00:00Z'
 * };
 * 
 * // Conditional permission - users can only update their own records
 * const conditionalPerm: PermissionDefinition = {
 *   id: 'perm_002',
 *   entity_id: 'ent_orders_001',
 *   role: 'user',
 *   action: 'update',
 *   conditions: {
 *     field: 'created_by',
 *     operator: 'eq',
 *     value: '$user.id'
 *   },
 *   is_allowed: true,
 *   created_at: '2024-01-01T00:00:00Z'
 * };
 * 
 * // Field-level permissions - hide sensitive fields from regular users
 * const fieldPerm: PermissionDefinition = {
 *   id: 'perm_003',
 *   entity_id: 'ent_users_001',
 *   role: 'user',
 *   action: 'read',
 *   is_allowed: true,
 *   field_permissions: {
 *     'salary': false,      // Hide salary field
 *     'email': true,        // Show email field
 *     'phone_read': true,   // Can read phone
 *     'phone_write': false  // Cannot modify phone
 *   },
 *   created_at: '2024-01-01T00:00:00Z'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface PermissionDefinition {
  /** Unique identifier for this permission rule */
  permission_id: string;
  /** ID of the entity this permission applies to */
  permission_entity_id: string;
  /** Role name this permission is granted to */
  permission_role: string;
  /** Operation type this permission controls */
  permission_action: OperationType;
  /** Optional conditions that must be met (JSON object) */
  permission_conditions?: Record<string, any>;
  /** Whether this permission grants (true) or denies (false) access */
  permission_is_allowed: boolean;
  /** Whether this permission rule is currently active */
  permission_is_active?: boolean;
  /** ISO timestamp when permission was created */
  permission_created_at: string;
  /** Field-level permissions (field_name: allowed, field_name_read: read_only) */
  permission_field_permissions?: Record<string, boolean>;
}