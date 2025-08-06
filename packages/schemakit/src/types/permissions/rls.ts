/**
 * Row Level Security (RLS) types
 * 
 * These types implement SchemaKit's advanced row-level security system,
 * allowing fine-grained control over which records users can access.
 * 
 * @since 0.1.0
 */

/**
 * Single condition for row-level security filtering
 * 
 * Defines a filter condition that can be applied to queries to restrict
 * which rows a user can access based on their role and context.
 * 
 * @example
 * ```typescript
 * // Users can only see records in their department
 * const departmentCondition: RLSCondition = {
 *   field: 'department',
 *   op: 'eq',
 *   value: 'currentUser.department',
 *   exposed: false // Hidden from user, automatically applied
 * };
 * 
 * // Analysts can filter by priority (user-modifiable)
 * const priorityCondition: RLSCondition = {
 *   field: 'priority',
 *   op: 'in',
 *   value: ['high', 'urgent'],
 *   exposed: true, // User can modify this filter
 *   metadata: {
 *     type: 'string',
 *     options: ['low', 'medium', 'high', 'urgent']
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface RLSCondition {
  /** Field name to filter on */
  field: string;
  /** Comparison operator */
  op: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'like' | 'isNull' | 'notNull';
  /** Value to compare against (can include context variables like 'currentUser.id') */
  value: any;
  /** Whether users can see and modify this condition */
  exposed?: boolean;
  /** Metadata for exposed conditions (validation, UI hints) */
  metadata?: {
    /** Data type for validation */
    type: 'number' | 'string';
    /** Minimum value (for numbers) */
    min?: number;
    /** Maximum value (for numbers) */
    max?: number;
    /** Allowed values (for dropdowns) */
    options?: string[];
  };
}

/**
 * Group of conditions combined with AND/OR logic
 * 
 * @example
 * ```typescript
 * // Manager role: can see active records in their department
 * const managerRule: RLSRule = {
 *   conditions: [
 *     { field: 'department', op: 'eq', value: 'currentUser.department' },
 *     { field: 'status', op: 'eq', value: 'active' }
 *   ],
 *   combinator: 'AND' // Both conditions must be true
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface RLSRule {
  /** List of conditions to evaluate */
  conditions: RLSCondition[];
  /** How to combine conditions (AND = all must be true, OR = any can be true) */
  combinator: 'AND' | 'OR';
}

/**
 * Complete RLS configuration mapping roles to their restrictions
 * 
 * @example
 * ```typescript
 * const restrictions: RoleRestrictions = {
 *   // Admins see everything in their department
 *   'admin': [{
 *     conditions: [{ field: 'department', op: 'eq', value: 'currentUser.department' }],
 *     combinator: 'AND'
 *   }],
 *   
 *   // Users only see their own records
 *   'user': [{
 *     conditions: [{ field: 'created_by', op: 'eq', value: 'currentUser.id' }],
 *     combinator: 'AND'
 *   }],
 *   
 *   // Analysts have complex filtering options
 *   'analyst': [{
 *     conditions: [
 *       { field: 'priority', op: 'in', value: ['high'], exposed: true },
 *       { field: 'created_at', op: 'gte', value: '2024-01-01' }
 *     ],
 *     combinator: 'AND'
 *   }]
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface RoleRestrictions {
  /** Role name mapped to array of rules (multiple rules are combined with OR) */
  [role: string]: RLSRule[];
}

/**
 * Persistent RLS definition stored in system_rls table
 * 
 * @example
 * ```typescript
 * const rlsDef: RLSDefinition = {
 *   id: 'rls_001',
 *   entity_id: 'ent_orders_001',
 *   role: 'manager',
 *   rls_config: {
 *     relationbetweenconditions: 'and',
 *     conditions: [
 *       { field: 'department', op: 'eq', value: '$context.user.department' }
 *     ]
 *   },
 *   is_active: true,
 *   created_at: '2024-01-01T00:00:00Z',
 *   updated_at: '2024-01-01T00:00:00Z'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface RLSDefinition {
  /** Unique identifier for this RLS rule */
  rls_id: string;
  /** Entity this rule applies to */
  rls_entity_id: string;
  /** Role this rule applies to */
  rls_role: string;
  /** Optional view this rule is specific to */
  rls_view_id?: string;
  /** RLS configuration */
  rls_config: {
    /** How to combine multiple conditions */
    relationbetweenconditions: 'and' | 'or';
    /** Array of filter conditions */
    conditions: RLSCondition[];
  };
  /** Whether this rule is currently active */
  rls_is_active: boolean;
  /** ISO timestamp when rule was created */
  rls_created_at: string;
  /** ISO timestamp when rule was last updated */
  rls_updated_at: string;
}

/**
 * Runtime RLS conditions (internal use)
 * 
 * @internal
 * @since 0.1.0
 */
export interface RLSConditions {
  /** Generated SQL WHERE clause (legacy) */
  sql?: string;
  /** SQL parameters (legacy) */
  params?: any[];
  /** Structured conditions (new format) */
  conditions?: Array<{ field: string; operator: string; value: any }>;
}

/**
 * Interface for RLS management implementations
 * 
 * @example
 * ```typescript
 * class CustomRLSManager implements IRLSManager {
 *   setRestrictions(restrictions: RoleRestrictions): void {
 *     // Custom implementation
 *   }
 *   
 *   getRestriction(roles: string[]): RLSRule[] | undefined {
 *     // Return rules for highest priority role
 *   }
 *   
 *   generateQuery(user: any, baseQuery: string, userInputs: Record<string, any>, model: string): string {
 *     // Generate SQL with RLS WHERE clauses
 *   }
 *   
 *   getExposedConditions(roles: string[]): RLSCondition[] {
 *     // Return conditions users can modify
 *   }
 * }
 * ```
 * 
 * @since 0.1.0
 */
export interface IRLSManager {
  /** Set the role restrictions configuration */
  setRestrictions(restrictions: RoleRestrictions): void;
  /** Get restrictions for given roles (returns highest priority) */
  getRestriction(roles: string[]): RLSRule[] | undefined;
  /** Generate SQL query with RLS conditions applied */
  generateQuery(user: any, baseQuery: string, userInputs: Record<string, any>, model: string): string;
  /** Get conditions that users can see and modify */
  getExposedConditions(roles: string[]): RLSCondition[];
}