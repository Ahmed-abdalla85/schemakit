/**
 * UnifiedEntityFactory - Factory for creating UnifiedEntityHandler instances
 * 
 * This factory:
 * - Loads entity configurations from the database
 * - Creates UnifiedEntityHandler instances
 * - Manages entity handler cache
 */

import { DatabaseAdapter } from '../../database/adapter';
import { UnifiedEntityHandler } from './unified-entity-handler';
import { EntityConfig } from './types';
import { createDbAdapter } from './adapters/database-adapter-bridge';
import { safeJsonParse } from '../../utils/json-helpers';

export interface UnifiedEntityFactoryOptions {
  cacheEnabled?: boolean;
  tenantId?: string;
}

export class UnifiedEntityFactory {
  private databaseAdapter: DatabaseAdapter;
  private entityHandlerCache: Map<string, UnifiedEntityHandler> = new Map();
  private cacheEnabled: boolean;
  private defaultTenantId: string;

  constructor(databaseAdapter: DatabaseAdapter, options: UnifiedEntityFactoryOptions = {}) {
    this.databaseAdapter = databaseAdapter;
    this.cacheEnabled = options.cacheEnabled !== false;
    this.defaultTenantId = options.tenantId || 'default';
  }

  /**
   * Create or get a UnifiedEntityHandler for an entity
   */
  async createHandler(entityName: string, tenantId?: string): Promise<UnifiedEntityHandler> {
    const effectiveTenantId = tenantId || this.defaultTenantId;
    const cacheKey = `${entityName}:${effectiveTenantId}`;

    // Check cache first
    if (this.cacheEnabled && this.entityHandlerCache.has(cacheKey)) {
      return this.entityHandlerCache.get(cacheKey)!;
    }

    // Load entity configuration
    const entityConfig = await this.loadEntityConfig(entityName);
    if (!entityConfig) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    // Create DbAdapter
    const dbAdapter = createDbAdapter(this.databaseAdapter);

    // Create handler
    const handler = new UnifiedEntityHandler(dbAdapter, entityConfig, effectiveTenantId);

    // Cache if enabled
    if (this.cacheEnabled) {
      this.entityHandlerCache.set(cacheKey, handler);
    }

    return handler;
  }

  /**
   * Load entity configuration from database
   */
  private async loadEntityConfig(entityName: string): Promise<EntityConfig | null> {
    // Load entity definition
    const entities = await this.databaseAdapter.query<any>(
      'SELECT * FROM system_entities WHERE name = ? AND is_active = ?',
      [entityName, 1]
    );

    if (entities.length === 0) return null;

    const entity = entities[0];
    const entityId = entity.id;

    // Load fields
    const fields = await this.databaseAdapter.query<any>(
      'SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

    // Load permissions
    const permissions = await this.databaseAdapter.query<any>(
      'SELECT * FROM system_permissions WHERE entity_id = ? AND is_active = ?',
      [entityId, 1]
    );

    // Load workflows
    const workflows = await this.databaseAdapter.query<any>(
      'SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

    // Load views
    const views = await this.databaseAdapter.query<any>(
      'SELECT * FROM system_views WHERE entity_id = ?',
      [entityId]
    );

    // Transform to EntityConfig format
    const entityConfig: EntityConfig = {
      entity: {
        entity_id: entity.id,
        entity_name: entity.name,
        entity_table_name: entity.table_name,
        entity_display_name: entity.display_name,
        entity_description: entity.description,
        entity_is_active: entity.is_active,
        entity_metadata: safeJsonParse(entity.metadata, {})
      },
      fields: fields.map((field: any) => ({
        field_id: field.id,
        field_name: field.name,
        field_type: field.type,
        field_is_required: field.is_required,
        field_is_unique: field.is_unique,
        field_default_value: field.default_value,
        field_validation_rules: safeJsonParse(field.validation_rules, {}),
        field_display_name: field.display_name,
        field_description: field.description,
        field_weight: field.order_index,
        field_reference_entity: field.reference_entity,
        field_metadata: safeJsonParse(field.metadata, {})
      })),
      permissions: permissions.map((perm: any) => ({
        permission_id: perm.id,
        permission_role_name: perm.role,
        permission_can_create: perm.action === 'create' && perm.is_allowed,
        permission_can_read: perm.action === 'read' && perm.is_allowed,
        permission_can_update: perm.action === 'update' && perm.is_allowed,
        permission_can_delete: perm.action === 'delete' && perm.is_allowed,
        permission_conditions: safeJsonParse(perm.conditions, {}),
        permission_field_permissions: safeJsonParse(perm.field_permissions, {}),
        permission_weight: 0
      })),
      workflow: workflows.map((workflow: any) => ({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        workflow_description: workflow.description,
        workflow_trigger_event: workflow.trigger_event,
        workflow_initial_state: workflow.initial_state,
        workflow_conditions: safeJsonParse(workflow.conditions, {}),
        workflow_actions: safeJsonParse(workflow.actions, []),
        states: [],
        transitions: []
      })),
      views: views.map((view: any) => ({
        view_id: view.id,
        view_name: view.name,
        view_displayed_fields: view.fields || [],
        view_rls_filters: safeJsonParse(view.rls_filters, {}),
        view_joins: safeJsonParse(view.joins, []),
        view_sort: safeJsonParse(view.sort, []),
        view_weight: 0,
        view_query_config: safeJsonParse(view.query_config, {})
      }))
    };

    return entityConfig;
  }

  /**
   * Clear handler cache
   */
  clearCache(entityName?: string, tenantId?: string): void {
    if (entityName) {
      const effectiveTenantId = tenantId || this.defaultTenantId;
      const cacheKey = `${entityName}:${effectiveTenantId}`;
      this.entityHandlerCache.delete(cacheKey);
    } else {
      this.entityHandlerCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      handlerCacheSize: this.entityHandlerCache.size,
      cachedEntities: Array.from(this.entityHandlerCache.keys())
    };
  }
}