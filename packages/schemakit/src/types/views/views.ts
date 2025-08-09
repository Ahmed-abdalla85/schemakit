/**
 * View definition and execution types
 * 
 * Views in SchemaKit provide pre-configured query templates with filtering,
 * sorting, joins, and field selection for entities.
 * 
 * @since 0.1.0
 */

import { SortDirection, JoinType } from '../core/common';

/**
 * Definition for joining related entities in views
 * 
 * @example
 * ```typescript
 * const join: JoinDefinition = {
 *   entity: 'users',
 *   type: 'left',
 *   on: 'orders.user_id = users.id',
 *   alias: 'creator'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface JoinDefinition {
  /** Entity name to join with */
  entity: string;
  /** Type of join (default: 'inner') */
  type?: JoinType;
  /** JOIN condition (e.g., 'orders.user_id = users.id') */
  on: string;
  /** Optional alias for the joined entity */
  alias?: string;
}

/**
 * Sorting configuration for views
 * 
 * @example
 * ```typescript
 * const sort: SortDefinition = {
 *   field: 'created_at',
 *   direction: 'desc' // Newest first
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface SortDefinition {
  /** Field name to sort by */
  field: string;
  /** Sort direction */
  direction: SortDirection;
}

/**
 * Pagination defaults for views
 * 
 * @example
 * ```typescript
 * const pagination: PaginationDefinition = {
 *   default_limit: 20,
 *   max_limit: 100
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface PaginationDefinition {
  /** Default number of records per page */
  default_limit: number;
  /** Maximum allowed records per page */
  max_limit: number;
}

/**
 * Complete view definition stored in system_views table
 * 
 * Views provide pre-configured query templates that users can execute
 * with optional runtime filters and pagination.
 * 
 * @example
 * ```typescript
 * const view: ViewDefinition = {
 *   id: 'view_001',
 *   entity_id: 'ent_orders_001',
 *   name: 'recent-orders',
 *   query_config: {
 *     filters: {
 *       status: 'active',
 *       created_at: { $gte: '2024-01-01' }
 *     },
 *     sorting: [
 *       { field: 'created_at', direction: 'desc' },
 *       { field: 'priority', direction: 'asc' }
 *     ],
 *     joins: [{
 *       entity: 'users',
 *       type: 'left',
 *       on: 'orders.user_id = users.id'
 *     }],
 *     pagination: {
 *       default_limit: 20,
 *       max_limit: 100
 *     }
 *   },
 *   fields: ['id', 'title', 'status', 'created_at', 'users.name'],
 *   is_default: false,
 *   created_by: 'admin',
 *   is_public: true,
 *   metadata: { description: 'Recent active orders with user info' }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface ViewDefinition {
  /** Unique identifier for this view */
  view_id: string;
  /** Entity this view applies to */
  view_entity_id: string;
  /** View name for reference */
  view_name: string;

  /** Audit fields */
  view_created_at?: string;
  view_updated_at?: string;
  view_created_by?: string;
  view_modified_by?: string;

  /** Ordering and placement */
  view_weight?: number;
  view_status?: string; // e.g. 'active' | 'archived'
  view_slot?: number;

  /** Fields to include in results (empty = all fields) */
  view_fields?: string[];
  /** Fixed filters applied to all executions */
  view_filters?: Record<string, any>;
  /** Entity joins to include related data */
  view_joins?: JoinDefinition[];
  /** Default sorting order */
  view_sort?: SortDefinition[];

  /** Optional display title */
  view_title?: string;

  /** Optional: retained for compatibility with older data; ignored by new code */
  view_query_config?: {
    filters?: Record<string, any>;
    joins?: JoinDefinition[];
    sorting?: SortDefinition[];
    pagination?: PaginationDefinition;
  };
  view_is_default?: boolean;
  view_is_public?: boolean;
  view_metadata?: Record<string, any>;
}

/**
 * Runtime options for executing views
 * 
 * @example
 * ```typescript
 * const options: ViewOptions = {
 *   filters: {
 *     priority: 'high',
 *     assignee: 'john-doe'
 *   },
 *   pagination: {
 *     page: 2,
 *     limit: 50
 *   }
 * };
 * 
 * const result = await entity.view('active-tasks', options, context);
 * ```
 * 
 * @since 0.1.0
 */
export interface ViewOptions {
  /** Additional filters to apply at runtime */
  filters?: Record<string, any>;
  /** Pagination options */
  pagination?: {
    /** Page number (1-based) */
    page: number;
    /** Records per page */
    limit: number;
  };
  /** Whether to compute totals/stats (grouped counts) */
  stats?: boolean;
}

/**
 * Result from executing a view
 * 
 * @example
 * ```typescript
 * const result: ViewResult = {
 *   results: [
 *     { id: 1, name: 'John', department: 'Engineering' },
 *     { id: 2, name: 'Jane', department: 'Marketing' }
 *   ],
 *   total: 2,
 *   fields: [
 *     { name: 'id', type: 'integer', display_name: 'ID' },
 *     { name: 'name', type: 'string', display_name: 'Full Name' }
 *   ],
 *   meta: {
 *     entityName: 'users',
 *     viewName: 'active-users',
 *     query: 'SELECT id, name FROM users WHERE status = ?'
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface ViewResult {
  /** Array of records returned by the view */
  results: any[];
  /** Total number of matching records (before pagination) */
  total: number;
  /** Field definitions for the returned columns */
  fields: import('../core').FieldDefinition[];
  /** Execution metadata */
  meta: {
    /** Entity name the view was executed on */
    entityName: string;
    /** Name of the view that was executed */
    viewName: string;
    /** Generated SQL query (for debugging) */
    query?: string;
  };
  /** Optional: stats array similar to legacy temp output */
  stats?: any[];
  // Legacy compatibility fields are intentionally optional and should only be populated
  // when explicitly requested to avoid breaking existing consumers/tests.
  defaultField?: string;
  modelName?: string;
  modelSystemName?: string;
  isProcessOn?: boolean;
  addAllowed?: boolean;
  modifyAllowed?: boolean;
  manageAllowed?: boolean;
}