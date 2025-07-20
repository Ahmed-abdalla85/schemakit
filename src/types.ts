/**
 * Simplified Core Type Definitions for SchemaKit
 */

// ===== SCHEMAKIT OPTIONS =====

export interface SchemaKitOptions {
  adapter?: {
    type?: string;
    config?: Record<string, any>;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

// ===== FIELD TYPES =====

export type FieldType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'object'
  | 'array'
  | 'reference'
  | 'computed';

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

// ===== CONTEXT =====

export interface Context {
  user?: {
    id?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: any;
  };
  tenantId?: string;
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

// ===== ENTITY DEFINITIONS =====

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

// ===== PERMISSIONS =====

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

export interface RLSCondition {
  field: string;
  op: string;
  value: any;
}

export interface RLSConditions {
  sql: string;
  params: any[];
}

// ===== VIEWS =====

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

export interface JoinDefinition {
  entity: string;
  type?: 'inner' | 'left' | 'right';
  on: string;
  alias?: string;
}

export interface SortDefinition {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationDefinition {
  default_limit: number;
  max_limit: number;
}

// ===== WORKFLOWS =====

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

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

// ===== MAIN CONFIGURATION =====

export interface EntityConfiguration {
  entity: EntityDefinition;
  fields: FieldDefinition[];
  permissions: PermissionDefinition[];
  views: ViewDefinition[];
  workflows: WorkflowDefinition[];
  rls: RLSDefinition[];
}

// ===== QUERY RESULTS =====

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