/**
 * EntityManager - Entity Configuration Management
 * Responsible for entity configuration loading and caching only
 * 
 * This is a focused data layer that handles:
 * - Loading entity configurations
 * - Managing entity cache
 * - Providing database access for configuration queries
 */
import { DatabaseManager } from '../database/database-manager';
import { FluentQueryBuilder } from '../database/fluent-query-builder';
import { EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, ViewDefinition, WorkflowDefinition, RLSDefinition, Context } from '../types';
import { QueryManager } from '../database/query-manager';
import { InstallManager } from '../database/install-manager';
import { safeJsonParse } from '../utils/json-helpers';

/**
 * Cache statistics interface
 */
export interface CacheStats {
    entityCacheSize: number;
    entities: string[];
    hitRate?: number;
    missRate?: number;
}

/**
 * EntityManager class - Entity Configuration Management
 * 
 * Single Responsibility: Manage entity configurations and caching
 * 
 * Note: Business logic (validation, permissions, workflows) and data operations
 * are handled by separate managers and EntityAPI
 */
export class EntityManager {
  private databaseManager: DatabaseManager;
  private queryManager: QueryManager;
  private installManager: InstallManager;
  
  // Schema loading and caching
  private entityCache: Map<string, EntityConfiguration> = new Map();
  
  private cacheEnabled = true;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Create a new EntityManager instance
   * @param databaseManager Database manager
   * @param options Options
   */
  constructor(databaseManager: DatabaseManager, options?: { cacheEnabled?: boolean }) {
    this.databaseManager = databaseManager;
    const databaseAdapter = databaseManager.getAdapter();
    this.queryManager = new QueryManager(databaseAdapter);
    this.installManager = new InstallManager(databaseAdapter);
    this.cacheEnabled = options?.cacheEnabled !== false;
  }

  // === DATABASE ACCESS METHODS ===

  /**
   * Create a fluent query builder for a table
   * @param tableName Table name
   * @param tenantId Tenant ID
   * @returns FluentQueryBuilder instance
   */
  db(tableName: string, tenantId: string = 'default'): FluentQueryBuilder {
    return this.databaseManager.db(tableName, tenantId);
  }

  /**
   * Get table reference for fluent queries
   * @param tableName Table name
   * @param tenantId Tenant ID
   * @returns FluentQueryBuilder instance
   */
  table(tableName: string, tenantId: string = 'default'): FluentQueryBuilder {
    return this.databaseManager.table(tableName, tenantId);
  }

  /**
   * Get database manager for advanced operations
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }

  // === CONFIGURATION MANAGEMENT ===

  /**
   * Load entity configuration
   * @param entityName Entity name
   * @param context User context
   * @returns Entity configuration
   */
  async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    // Check cache first
    if (this.cacheEnabled && this.entityCache.has(entityName)) {
      this.cacheHits++;
      return this.entityCache.get(entityName)!;
    }

    this.cacheMisses++;

    // Load entity configuration components
    const entity = await this.loadEntityDefinition(entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    const fields = await this.loadEntityFields(entity.id);
    const permissions = await this.loadEntityPermissions(entity.id, context);
    const views = await this.loadEntityViews(entity.id);
    const workflows = await this.loadEntityWorkflows(entity.id);
    const rls = await this.loadEntityRLS(entity.id, context);

    const entityConfig: EntityConfiguration = {
      entity,
      fields,
      permissions,
      views,
      workflows,
      rls
    };

    // Cache the result
    if (this.cacheEnabled) {
      this.entityCache.set(entityName, entityConfig);
    }

    return entityConfig;
  }

  // === SCHEMA MANAGEMENT ===

  /**
   * Reinstall SchemaKit
   */
  async reinstall(): Promise<void> {
    await this.installManager.install();
    this.clearAllCache();
  }

  /**
   * Clear entity cache
   */
  clearEntityCache(entityName?: string): void {
    if (entityName) {
      this.entityCache.delete(entityName);
    } else {
      this.entityCache.clear();
    }
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    this.entityCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    return {
      entityCacheSize: this.entityCache.size,
      entities: Array.from(this.entityCache.keys()),
      hitRate: total > 0 ? this.cacheHits / total : undefined,
      missRate: total > 0 ? this.cacheMisses / total : undefined
    };
  }

  /**
   * Get all loaded entities
   */
  getLoadedEntities(): string[] {
    return Array.from(this.entityCache.keys());
  }

  // === PRIVATE SCHEMA LOADING METHODS ===

  private async loadEntityDefinition(entityName: string): Promise<EntityDefinition | null> {
    const entities = await this.databaseManager.query<EntityDefinition>(
      'SELECT * FROM system_entities WHERE name = ? AND is_active = ?',
      [entityName, 1]
    );

    if (entities.length === 0) return null;

    const entity = entities[0];
    if (entity.metadata && typeof entity.metadata === 'string') {
      entity.metadata = safeJsonParse(entity.metadata, {});
    }
    return entity;
  }

  private async loadEntityFields(entityId: string): Promise<FieldDefinition[]> {
    const fields = await this.databaseManager.query<FieldDefinition>(
      'SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

    for (const field of fields) {
      if (field.metadata && typeof field.metadata === 'string') {
        field.metadata = safeJsonParse(field.metadata, {});
      }
      if (field.validation_rules && typeof field.validation_rules === 'string') {
        field.validation_rules = safeJsonParse(field.validation_rules, {});
      }
    }
    return fields;
  }

  private async loadEntityPermissions(entityId: string, context: Context): Promise<PermissionDefinition[]> {
    const userRoles = context.user?.roles || [];
    const roles = userRoles.length > 0 ? userRoles : ['public'];

    const permissions = await this.databaseManager.query<PermissionDefinition>(
      'SELECT * FROM system_permissions WHERE entity_id = ? AND role IN (?) AND is_active = ?',
      [entityId, roles.join(','), 1]
    );

    for (const permission of permissions) {
      if (permission.conditions && typeof permission.conditions === 'string') {
        permission.conditions = safeJsonParse(permission.conditions, {});
      }
    }
    return permissions;
  }

  private async loadEntityViews(entityId: string): Promise<ViewDefinition[]> {
    const views = await this.databaseManager.query<ViewDefinition>(
      'SELECT * FROM system_views WHERE entity_id = ?',
      [entityId]
    );

    for (const view of views) {
      if (view.query_config && typeof view.query_config === 'string') {
        view.query_config = safeJsonParse(view.query_config, {});
      }
    }
    return views;
  }

  private async loadEntityWorkflows(entityId: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.databaseManager.query<WorkflowDefinition>(
      'SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

    for (const workflow of workflows) {
      if (workflow.conditions && typeof workflow.conditions === 'string') {
        workflow.conditions = safeJsonParse(workflow.conditions, {});
      }
      if (workflow.actions && typeof workflow.actions === 'string') {
        workflow.actions = safeJsonParse(workflow.actions, []);
      }
    }
    return workflows;
  }

  private async loadEntityRLS(entityId: string, context: Context): Promise<RLSDefinition[]> {
    const userRoles = context.user?.roles || [];
    const roles = userRoles.length > 0 ? userRoles : ['public'];

    const rlsRules = await this.databaseManager.query<RLSDefinition>(
      'SELECT * FROM system_rls WHERE entity_id = ? AND role IN (?) AND is_active = ?',
      [entityId, roles.join(','), 1]
    );

    for (const rule of rlsRules) {
      if (rule.rls_config && typeof rule.rls_config === 'string') {
        rule.rls_config = safeJsonParse(rule.rls_config, {
          relationbetweenconditions: 'and',
          conditions: []
        });
      }
    }
    return rlsRules;
  }
}