import { DB } from '../database/db';
import { safeJsonParse } from '../utils/json-helpers';
import type { EntityDefinition } from '../types/core';
import type { FieldDefinition } from '../types/core';
import type { PermissionDefinition, RLSDefinition } from '../types/permissions';
import type { ViewDefinition } from '../types/views';
import type { WorkflowDefinition } from '../types/workflows';

export class MetadataLoader {
  constructor(private readonly db: DB) {}

  async loadEntityDefinition(entityName: string): Promise<EntityDefinition | null> {
    const results = await this.db
      .select('*')
      .from('system_entities')
      .where({ entity_name: entityName })
      .get();

    const entities = Array.isArray(results) ? results : [results];
    if (!entities.length || !entities[0]) return null;

    const entity = entities[0];
    if (entity.metadata && typeof entity.metadata === 'string') {
      entity.metadata = safeJsonParse(entity.metadata, {});
    }
    return entity as EntityDefinition;
  }

  async loadFields(entityId: string): Promise<FieldDefinition[]> {
    const fields = await this.db
      .select('*')
      .from('system_fields')
      .where({ field_entity_id: entityId })
      .get();

    return fields.map((field: any) => ({
      ...field,
      metadata: field.metadata && typeof field.metadata === 'string' 
        ? safeJsonParse(field.metadata, {}) 
        : field.metadata,
      validation_rules: field.validation_rules && typeof field.validation_rules === 'string'
        ? safeJsonParse(field.validation_rules, {})
        : field.validation_rules
    })) as FieldDefinition[];
  }

  async loadPermissions(entityId: string): Promise<PermissionDefinition[]> {
    const permissions = await this.db
      .select('*')
      .from('system_permissions')
      .where({ permission_entity_id: entityId, permission_status: 'active' })
      .get();

    return permissions.map((permission: any) => ({
      ...permission,
      conditions: permission.conditions && typeof permission.conditions === 'string'
        ? safeJsonParse(permission.conditions, {})
        : permission.conditions
    })) as PermissionDefinition[];
  }

  async loadWorkflows(entityId: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.db
      .select('*')
      .from('system_workflows')
      .where({ workflow_entity_id: entityId, workflow_status: 'active' })
      .get();
    
    return workflows.map((workflow: any) => ({
      ...workflow,
      conditions: workflow.conditions && typeof workflow.conditions === 'string'
        ? safeJsonParse(workflow.conditions, {})
        : workflow.conditions,
      actions: workflow.actions && typeof workflow.actions === 'string'
        ? safeJsonParse(workflow.actions, [])
        : workflow.actions
    })) as WorkflowDefinition[];
  }

  async loadRLS(entityId: string): Promise<RLSDefinition[]> {
    try {
      const rlsRules = await this.db
        .select('*')
        .from('system_rls')
        .where({ rls_entity_id: entityId, rls_is_active: true })
        .get();
      const list = Array.isArray(rlsRules) ? rlsRules : [];
      return list.map((rule: any) => ({
        ...rule,
        rls_config: rule.rls_config && typeof rule.rls_config === 'string'
          ? safeJsonParse(rule.rls_config, { relationbetweenconditions: 'and', conditions: [] })
          : rule.rls_config
      })) as RLSDefinition[];
    } catch {
      return [];
    }
  }

  async loadViews(entityId: string): Promise<ViewDefinition[]> {
    const views = await this.db
      .select('*')
      .from('system_views')
      .where({ view_entity_id: entityId })
      .get();

    return views.map((view: any) => ({
      ...view,
      view_fields: typeof view.view_fields === 'string' 
        ? safeJsonParse(view.view_fields, []) 
        : view.view_fields,
      view_filters: typeof view.view_filters === 'string' 
        ? safeJsonParse(view.view_filters, {}) 
        : view.view_filters,
      view_joins: typeof view.view_joins === 'string' 
        ? safeJsonParse(view.view_joins, []) 
        : view.view_joins,
      view_sort: typeof view.view_sort === 'string' 
        ? safeJsonParse(view.view_sort, []) 
        : view.view_sort,
    })) as ViewDefinition[];
  }
}

