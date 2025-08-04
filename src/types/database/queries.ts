/**
 * Database query and result types
 * 
 * These types define query building, execution, and result handling
 * for SchemaKit's database abstraction layer.
 * 
 * @since 0.1.0
 */

import { SortDirection } from '../core/common';

/**
 * Single filter condition for database queries
 * 
 * @example
 * ```typescript
 * const filters: QueryFilter[] = [
 *   { field: 'status', operator: 'eq', value: 'active' },
 *   { field: 'age', operator: 'gte', value: 18 },
 *   { field: 'department', operator: 'in', value: ['sales', 'marketing'] }
 * ];
 * ```
 * 
 * @since 0.1.0
 */
export interface QueryFilter {
  /** Field name to filter on */
  field: string;
  /** Comparison operator (eq, ne, gt, lt, gte, lte, in, like, etc.) */
  operator: string;
  /** Value to compare against */
  value: any;
}

/**
 * Query execution options
 * 
 * @example
 * ```typescript
 * const options: QueryOptions = {
 *   orderBy: [
 *     { field: 'created_at', direction: 'DESC' },
 *     { field: 'name', direction: 'ASC' }
 *   ],
 *   limit: 50,
 *   offset: 100,
 *   groupBy: ['department', 'status'],
 *   having: [
 *     { field: 'COUNT(*)', operator: 'gt', value: 5 }
 *   ]
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface QueryOptions {
  /** Fields to sort by with direction */
  orderBy?: Array<{
    /** Field name to sort by */
    field: string;
    /** Sort direction (ASC or DESC) */
    direction: 'ASC' | 'DESC';
  }>;
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Fields to group results by */
  groupBy?: string[];
  /** Conditions to apply after grouping */
  having?: QueryFilter[];
}

/**
 * Compiled SQL query ready for execution
 * 
 * @example
 * ```typescript
 * const query: BuiltQuery = {
 *   sql: 'SELECT * FROM users WHERE status = ? AND age >= ? ORDER BY created_at DESC LIMIT ?',
 *   params: ['active', 18, 50]
 * };
 * 
 * // Execute the query
 * const results = await adapter.executeRaw(query.sql, query.params);
 * ```
 * 
 * @since 0.1.0
 */
export interface BuiltQuery {
  /** Generated SQL query string with parameter placeholders */
  sql: string;
  /** Parameter values to bind to the query */
  params: any[];
}

/**
 * Structured result from database queries
 * 
 * @example
 * ```typescript
 * const result: QueryResult<User> = {
 *   data: [
 *     { id: 1, name: 'John', email: 'john@example.com' },
 *     { id: 2, name: 'Jane', email: 'jane@example.com' }
 *   ],
 *   meta: {
 *     total: 25,      // Total matching records
 *     page: 2,        // Current page number
 *     per_page: 20,   // Records per page
 *     has_more: true  // More pages available
 *   },
 *   permissions: {
 *     can_create: true,
 *     can_update: false,
 *     can_delete: false
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface QueryResult<T = any> {
  /** Array of records returned by the query */
  data: T[];
  /** Pagination and count metadata */
  meta: {
    /** Total number of matching records (before pagination) */
    total: number;
    /** Current page number (1-based) */
    page: number;
    /** Number of records per page */
    per_page: number;
    /** Whether more pages are available */
    has_more: boolean;
  };
  /** Optional permission information for the current user */
  permissions?: {
    /** Whether user can create new records */
    can_create: boolean;
    /** Whether user can update existing records */
    can_update: boolean;
    /** Whether user can delete records */
    can_delete: boolean;
  };
}