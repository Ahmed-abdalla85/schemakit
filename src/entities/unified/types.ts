/**
 * Type definitions for UnifiedEntityHandler
 */

import { DatabaseAdapter } from '../../database/adapter';

// ===== DATABASE ADAPTER TYPES =====

export { DatabaseAdapter, QueryFilter, QueryOptions } from '../../database/adapter';

// ===== ENTITY CONFIGURATION =====

export interface EntityConfig {
  entity: {
    entity_id: string;
    entity_name: string;
    entity_table_name: string;
    entity_display_name: string;
    entity_description?: string;
    entity_is_active?: boolean;
    entity_metadata?: Record<string, any>;
  };
  fields: Array<{
    field_id: string;
    field_name: string;
    field_type: string;
    field_is_required: boolean;
    field_is_unique?: boolean;
    field_default_value?: any;
    field_validation_rules?: string | Record<string, any>;
    field_display_name?: string;
    field_description?: string;
    field_weight?: number;
    field_reference_entity?: string;
    field_metadata?: Record<string, any>;
  }>;
  permissions: Array<{
    permission_id: string;
    permission_role_name: string;
    permission_can_create: boolean;
    permission_can_read: boolean;
    permission_can_update: boolean;
    permission_can_delete: boolean;
    permission_conditions?: Record<string, any>;
    permission_field_permissions?: Record<string, boolean>;
    permission_weight?: number;
  }>;
  workflow: Array<{
    workflow_id: string;
    workflow_name: string;
    workflow_description?: string;
    workflow_trigger_event?: string;
    workflow_initial_state?: string;
    workflow_conditions?: Record<string, any>;
    workflow_actions?: Array<any>;
    states?: Array<any>;
    transitions?: Array<any>;
  }>;
  views: Array<{
    view_id: string;
    view_name: string;
    view_displayed_fields: string[];
    view_rls_filters?: Record<string, any>;
    view_joins?: Array<any>;
    view_sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    view_weight?: number;
    view_query_config?: Record<string, any>;
  }>;
}

// ===== FIELD DEFINITION =====

export interface Field {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  default?: any;
  validation?: ValidationRules;
  displayName?: string;
  description?: string;
  weight?: number;
  referenceEntity?: string;
  metadata?: Record<string, any>;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

// ===== CRUD OPERATION TYPES =====

export type CreateData = Record<string, any>;
export type UpdateData = Record<string, any>;

export interface ReadFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string | string[];
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// ===== OPERATION RESULTS =====

export interface OperationResult {
  success: boolean;
  message?: string;
  errors?: ValidationError[];
}

export interface CreateResult extends OperationResult {
  data?: Record<string, any>;
}

export interface ReadResult extends OperationResult {
  data?: Record<string, any>[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface UpdateResult extends OperationResult {
  data?: Record<string, any>;
}

export interface DeleteResult extends OperationResult {
  id?: string | number;
}

// ===== VALIDATION =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ===== JSON SCHEMA =====

export interface JSONSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  additionalProperties?: boolean;
}

// ===== PERMISSION =====

export interface Permission {
  role: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  conditions?: Record<string, any>;
  fieldPermissions?: Record<string, boolean>;
  weight?: number;
}

// ===== WORKFLOW =====

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerEvent?: string;
  initialState?: string;
  conditions?: Record<string, any>;
  actions?: Array<any>;
  states?: Array<any>;
  transitions?: Array<any>;
}

// ===== VIEW =====

export interface View {
  id: string;
  name: string;
  displayedFields: string[];
  rlsFilters?: Record<string, any>;
  joins?: Array<any>;
  sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  weight?: number;
  queryConfig?: Record<string, any>;
}

// ===== ENTITY INFO =====

export interface EntityInfo {
  entityName: string;
  displayName: string;
  tableName: string;
  tenantId: string;
  fieldCount: number;
  permissionCount: number;
  workflowCount: number;
  viewCount: number;
}