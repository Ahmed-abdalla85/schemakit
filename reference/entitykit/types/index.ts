// Base types for SchemaKit

export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'url' | 'text' | 'uuid';
  required?: boolean;
  default?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  weight?: number;
}

export interface Permission {
  role: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  weight?: number;
}

export interface WorkflowState {
  id: string;
  name: string;
  description?: string;
  weight?: number;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  conditions?: Record<string, any>;
  weight?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface View {
  id: string;
  name: string;
  displayedFields: string[];
  rlsFilters?: Record<string, any>;
  joins?: any[];
  sort?: { field: string; direction: 'ASC' | 'DESC' }[];
  weight?: number;
}

export interface EntityConfig {
  entity: {
    entity_id: string;
    entity_name: string;
    entity_display_name: string;
    entity_table_name: string;
  };
  fields: Field[];
  permissions: Permission[];
  workflow: Workflow[];
  views: View[];
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface PermissionResult {
  allowed: boolean;
  role: string;
  action: PermissionAction;
  reason?: string;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
}

export interface CreateData { [key: string]: any; }
export interface UpdateData { [key: string]: any; }
export interface ReadFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string[];
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  [key: string]: any;
}

export interface CreateResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: ValidationError[];
}

export interface ReadResult {
  success: boolean;
  data?: any[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  message: string;
}

export interface UpdateResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: ValidationError[];
}

export interface DeleteResult {
  success: boolean;
  id?: string;
  message: string;
}

export type GenericEntityRecord = Record<string, any>;

// Cache stats
export interface EntityCache {
  entityCacheSize: number;
  configCacheSize: number;
  entities: string[];
} 