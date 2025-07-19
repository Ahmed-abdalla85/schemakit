/**
 * Core type definitions for SchemaKit
 */
/**
 * Field types supported by SchemaKit
 */
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'json' | 'object' | 'array' | 'reference' | 'computed';
/**
 * CRUD operation types
 */
export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';
/**
 * User context for operations
 */
export interface Context {
    user?: {
        id?: string;
        roles?: string[];
        permissions?: string[];
        [key: string]: any;
    };
    request?: {
        ip?: string;
        userAgent?: string;
        timestamp?: string;
        [key: string]: any;
    };
    session?: {
        id?: string;
        expires?: string;
        [key: string]: any;
    };
    [key: string]: any;
}
/**
 * Entity definition from system_entities table
 */
export interface EntityDefinition {
    id: string;
    name: string;
    table_name: string;
    display_name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any>;
}
/**
 * Field definition from system_fields table
 */
export interface FieldDefinition {
    id: string;
    entity_id: string;
    name: string;
    type: FieldType;
    is_required: boolean;
    is_unique: boolean;
    is_primary_key?: boolean;
    default_value?: string;
    validation_rules?: Record<string, any>;
    display_name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
    reference_entity?: string;
    metadata?: Record<string, any>;
}
/**
 * Permission definition from system_permissions table
 */
export interface PermissionDefinition {
    id: string;
    entity_id: string;
    role: string;
    action: OperationType;
    conditions?: Record<string, any>;
    is_allowed: boolean;
    is_active?: boolean;
    created_at: string;
    field_permissions?: Record<string, boolean>;
}
/**
 * View definition from system_views table
 */
export interface ViewDefinition {
    id: string;
    entity_id: string;
    name: string;
    query_config: {
        filters?: Record<string, any>;
        joins?: JoinDefinition[];
        sorting?: SortDefinition[];
        pagination?: PaginationDefinition;
    };
    fields: string[];
    is_default: boolean;
    created_by?: string;
    is_public: boolean;
    metadata?: Record<string, any>;
}
/**
 * Join definition for view queries
 */
export interface JoinDefinition {
    entity: string;
    type?: 'inner' | 'left' | 'right';
    on: string;
    alias?: string;
}
/**
 * Sort definition for view queries
 */
export interface SortDefinition {
    field: string;
    direction: 'asc' | 'desc';
}
/**
 * Pagination definition for view queries
 */
export interface PaginationDefinition {
    default_limit: number;
    max_limit: number;
}
/**
 * Workflow definition from system_workflows table
 */
export interface WorkflowDefinition {
    id: string;
    entity_id: string;
    name: string;
    trigger_event: 'create' | 'update' | 'delete' | 'field_change';
    conditions?: Record<string, any>;
    actions: WorkflowAction[];
    is_active: boolean;
    order_index: number;
    metadata?: Record<string, any>;
}
/**
 * Workflow action definition
 */
export interface WorkflowAction {
    type: string;
    config: Record<string, any>;
}
/**
 * RLS definition from system_rls table
 */
export interface RLSDefinition {
    id: string;
    entity_id: string;
    role: string;
    view_id?: string;
    rls_config: {
        relationbetweenconditions: 'and' | 'or';
        conditions: RLSCondition[];
    };
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * RLS condition definition
 */
export interface RLSCondition {
    field: string;
    op: string;
    value: any;
}
/**
 * Built RLS conditions for query execution
 */
export interface RLSConditions {
    sql: string;
    params: any[];
}
/**
 * Complete entity configuration loaded from all system tables
 */
export interface EntityConfiguration {
    entity: EntityDefinition;
    fields: FieldDefinition[];
    permissions: PermissionDefinition[];
    views: ViewDefinition[];
    workflows: WorkflowDefinition[];
    rls: RLSDefinition[];
}
/**
 * Query result with metadata
 */
export interface QueryResult<T = any> {
    data: T[];
    meta: {
        total: number;
        page: number;
        per_page: number;
        has_more: boolean;
    };
    permissions?: {
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
    };
}
/**
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: {
        field: string;
        code: string;
        message: string;
        value?: any;
    }[];
    warnings?: {
        field: string;
        message: string;
        value?: any;
    }[];
}
