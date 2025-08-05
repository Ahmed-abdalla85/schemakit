/**
 * Entity and field definition types
 * 
 * These types define the structure of entities (tables) and their fields,
 * which form the core data model in SchemaKit's meta-database approach.
 * 
 * @since 0.1.0
 */

import { FieldType } from './common';

/**
 * Complete definition of a SchemaKit entity (table)
 * 
 * Stored in the `system_entities` table, this defines a business entity
 * with its metadata, table name, and display information.
 * 
 * @example
 * ```typescript
 * const entity: EntityDefinition = {
 *   entity_id: 'ent_customers_001',
 *   entity_name: 'customers',
 *   entity_table_name: 'app_customers',
 *   entity_display_name: 'Customers',
 *   entity_description: 'Customer database records',
 *   entity_is_active: true,
 *   entity_created_at: '2024-01-01T00:00:00Z',
 *   entity_updated_at: '2024-01-01T00:00:00Z',
 *   entity_metadata: { version: '1.0' }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface EntityDefinition {
  /** Unique identifier for this entity */
  entity_id: string;
  /** Entity name used in code (e.g., 'users', 'orders') */
  entity_name: string;
  /** Actual database table name (e.g., 'app_users') */
  entity_table_name: string;
  /** Human-readable display name */
  entity_display_name: string;
  /** Description of what this entity represents */
  entity_description: string;
  /** Whether this entity is currently active */
  entity_is_active: boolean;
  /** ISO timestamp when entity was created */
  entity_created_at: string;
  /** ISO timestamp when entity was last updated */
  entity_updated_at: string;
  /** Additional metadata as JSON object */
  entity_metadata?: Record<string, any>;
}

/**
 * Definition of a field (column) within an entity
 * 
 * Stored in the `system_fields` table, this defines individual columns
 * with their types, constraints, and display information.
 * 
 * @example
 * ```typescript
 * const field: FieldDefinition = {
 *   id: 'fld_email_001',
 *   entity_id: 'ent_users_001',
 *   name: 'email',
 *   type: 'string',
 *   is_required: true,
 *   is_unique: true,
 *   display_name: 'Email Address',
 *   description: 'User email for login',
 *   order_index: 2,
 *   is_active: true,
 *   validation_rules: {
 *     format: 'email',
 *     maxLength: 255
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface FieldDefinition {
  /** Unique identifier for this field */
  id: string;
  /** ID of the entity this field belongs to */
  entity_id: string;
  /** Field name used in code (e.g., 'email', 'created_at') */
  name: string;
  /** Data type of this field */
  type: FieldType;
  /** Whether this field must have a value */
  is_required: boolean;
  /** Whether values in this field must be unique */
  is_unique: boolean;
  /** Whether this field is part of the primary key */
  is_primary_key?: boolean;
  /** Default value for new records (as string) */
  default_value?: string;
  /** Validation rules as JSON object */
  validation_rules?: Record<string, any>;
  /** Human-readable display name */
  display_name: string;
  /** Description of what this field represents */
  description?: string;
  /** Display order (0-based index) */
  order_index: number;
  /** Whether this field is currently active */
  is_active: boolean;
  /** Entity name this field references (for foreign keys) */
  reference_entity?: string;
  /** Additional metadata as JSON object */
  metadata?: Record<string, any>;
}

/**
 * Complete configuration for an entity including all related definitions
 * 
 * This aggregates all the components that define an entity: the entity itself,
 * its fields, permissions, views, workflows, and RLS rules.
 * 
 * @example
 * ```typescript
 * const config: EntityConfiguration = {
 *   entity: entityDef,
 *   fields: [emailField, nameField],
 *   permissions: [readPermission, writePermission],
 *   views: [listView, detailView],
 *   workflows: [welcomeEmail],
 *   rls: [departmentRule]
 * };
 * 
 * // Used internally by SchemaKit to represent complete entity structure
 * const entity = new Entity('users', 'tenant-123', db);
 * await entity.initialize(); // Loads EntityConfiguration
 * ```
 * 
 * @since 0.1.0
 */
export interface EntityConfiguration {
  /** The entity definition */
  entity: EntityDefinition;
  /** All fields defined for this entity */
  fields: FieldDefinition[];
  /** Permission rules for this entity */
  permissions: import('../permissions').PermissionDefinition[];
  /** View definitions for this entity */
  views: import('../views').ViewDefinition[];
  /** Workflow definitions for this entity */
  workflows: import('../workflows').WorkflowDefinition[];
  /** Row-level security rules for this entity */
  rls: import('../permissions').RLSDefinition[];
}