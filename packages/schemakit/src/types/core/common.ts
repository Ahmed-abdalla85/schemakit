/**
 * Common base types used across SchemaKit
 * 
 * These fundamental types provide the building blocks for all SchemaKit functionality.
 * @since 0.1.0
 */

/**
 * Supported field data types in SchemaKit entities
 * 
 * @example
 * ```typescript
 * const field: FieldDefinition = {
 *   name: 'email',
 *   type: 'string', // FieldType
 *   is_required: true
 * };
 * ```
 * 
 * @since 0.1.0
 */
export type FieldType = 
  | 'string'      // Text data (VARCHAR)
  | 'number'      // Floating point numbers  
  | 'integer'     // Whole numbers
  | 'boolean'     // True/false values
  | 'date'        // Date only (YYYY-MM-DD)
  | 'datetime'    // Date and time with timezone
  | 'json'        // JSON data structures
  | 'object'      // Complex objects (stored as JSON)
  | 'array'       // Array data (stored as JSON)
  | 'reference'   // Foreign key to another entity
  | 'computed';   // Calculated fields (not stored)

/**
 * Standard CRUD operations supported by SchemaKit
 * 
 * @example
 * ```typescript
 * const permission: PermissionDefinition = {
 *   role: 'user',
 *   action: 'read', // OperationType
 *   is_allowed: true
 * };
 * ```
 * 
 * @since 0.1.0
 */
export type OperationType = 
  | 'create'  // Insert new records
  | 'read'    // Query and retrieve records
  | 'update'  // Modify existing records
  | 'delete'  // Remove records
  | 'list';   // Paginated query operations

/**
 * Sort direction for query ordering
 * 
 * @example
 * ```typescript
 * const sort: SortDefinition = {
 *   field: 'created_at',
 *   direction: 'desc' // SortDirection - newest first
 * };
 * ```
 * 
 * @since 0.1.0
 */
export type SortDirection = 'asc' | 'desc';

/**
 * SQL JOIN types for entity relationships
 * 
 * @example
 * ```typescript
 * const join: JoinDefinition = {
 *   entity: 'users',
 *   type: 'left', // JoinType - include all records from left table
 *   on: 'orders.user_id = users.id'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export type JoinType = 'inner' | 'left' | 'right';

/**
 * Events that can trigger workflow execution
 * 
 * @example
 * ```typescript
 * const workflow: WorkflowDefinition = {
 *   trigger_event: 'create', // WorkflowTrigger - run after record creation
 *   actions: [{ type: 'send-email', config: {...} }]
 * };
 * ```
 * 
 * @since 0.1.0
 */
export type WorkflowTrigger = 
  | 'create'       // After record creation
  | 'update'       // After record modification  
  | 'delete'       // After record deletion
  | 'field_change'; // When specific fields change