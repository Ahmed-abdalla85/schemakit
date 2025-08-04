/**
 * Entity and field definition types
 */

import { FieldType } from './common';

export interface EntityDefinition {
  entity_id: string;
  entity_name: string;
  entity_table_name: string;
  entity_display_name: string;
  entity_description: string;
  entity_is_active: boolean;
  entity_created_at: string;
  entity_updated_at: string;
  entity_metadata?: Record<string, any>;
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

export interface EntityConfiguration {
  entity: EntityDefinition;
  fields: FieldDefinition[];
  permissions: import('../permissions').PermissionDefinition[];
  views: import('../views').ViewDefinition[];
  workflows: import('../workflows').WorkflowDefinition[];
  rls: import('../permissions').RLSDefinition[];
}