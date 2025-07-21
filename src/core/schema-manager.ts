/**
 * SchemaManager
 * Responsible for loading and caching entity configurations
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, ViewDefinition, WorkflowDefinition, RLSDefinition, Context } from '../types';
import { safeJsonParse } from '../utils/json-helpers';
import { SqlQueryLoader } from './sql-query-loader';

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
 * SchemaManager class
 * Single responsibility: Handle schema loading and caching
 */
export class SchemaManager {
  private databaseAdapter: DatabaseAdapter;
  private sqlQueryLoader: SqlQueryLoader;
  
  // Schema loading and caching
  private entityCache: Map<string, EntityConfiguration> = new Map();
  private cacheEnabled = true;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Create a new SchemaManager instance
   * @param databaseAdapter Database adapter
   * @param options Options
   */
  constructor(databaseAdapter: DatabaseAdapter, options?: { cacheEnabled?: boolean }) {
    this.databaseAdapter = databaseAdapter;
    this.sqlQueryLoader = new SqlQueryLoader();
    this.cacheEnabled = options?.cacheEnabled !== false;
  }

  /**
   * Load entity configuration
   * @param entityName Entity name
   * @param context User context
   * @returns Entity configuration
   */
  async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    // Check if entity is already in cache
    if (this.cacheEnabled && this.entityCache.has(entityName)) {
      this.cacheHits++;
      const cachedEntity = this.entityCache.get(entityName);
      if (cachedEntity) {
        return cachedEntity;
      }
    }

    this.cacheMisses++;

    // Load entity definition
    const entityDefinition = await this.loadEntityDefinition(entityName);
    if (!entityDefinition) {
      throw new Error(`Entity '${entityName}' not found`);
    }

    // Load entity fields
    const fields = await this.loadEntityFields(entityDefinition.id);

    // Load entity permissions
    const permissions = await this.loadEntityPermissions(entityDefinition.id, context);

    // Load entity views
    const views = await this.loadEntityViews(entityDefinition.id);

    // Load entity workflows
    const workflows = await this.loadEntityWorkflows(entityDefinition.id);

    // Load entity RLS
    const rls = await this.loadEntityRLS(entityDefinition.id, context);

    // Create entity configuration
    const entityConfig: EntityConfiguration = {
      entity: entityDefinition,
      fields,
      permissions,
      views,
      workflows,
      rls
    };

    // Cache entity configuration
    if (this.cacheEnabled) {
      this.entityCache.set(entityName, entityConfig);
    }

    return entityConfig;
  }

  /**
   * Reload entity configuration (bypass cache)
   * @param entityName Entity name
   * @param context User context
   * @returns Entity configuration
   */
  async reloadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    // Remove from cache if exists
    this.clearEntityCache(entityName);

    // Load entity configuration
    return this.loadEntity(entityName, context);
  }

  /**
   * Check if SchemaKit is installed
   * @returns True if installed
   */
  async isSchemaKitInstalled(): Promise<boolean> {
    try {
      const sql = await this.sqlQueryLoader.loadQuery('check-installation');
      const result = await this.databaseAdapter.query<{ count: number }>(sql, ['table', 'system_entities']);
      return result.length > 0 && result[0].count > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get SchemaKit version
   * @returns Version string
   */
  async getVersion(): Promise<string> {
    try {
      const sql = await this.sqlQueryLoader.loadQuery('get-version');
      const result = await this.databaseAdapter.query<{ value: string }>(sql, ['version']);
      return result.length > 0 ? result[0].value : 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Clear entity cache for a specific entity or all entities
   * @param entityName Optional entity name to clear
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
   * @returns Cache statistics
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
   * @returns Array of entity names
   */
  getLoadedEntities(): string[] {
    return Array.from(this.entityCache.keys());
  }

  // === PRIVATE SCHEMA LOADING METHODS ===

  /**
   * Load entity definition
   * @param entityName Entity name
   * @returns Entity definition or null if not found
   * @private
   */
  private async loadEntityDefinition(entityName: string): Promise<EntityDefinition | null> {
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-definition');
    const entities = await this.databaseAdapter.query<EntityDefinition>(sql, [entityName, 1]);

    if (entities.length === 0) {
      return null;
    }

    const entity = entities[0];

    // Parse metadata if it's a string
    if (entity.metadata && typeof entity.metadata === 'string') {
      entity.metadata = safeJsonParse(entity.metadata, {});
    }

    return entity;
  }

  /**
   * Load entity fields
   * @param entityId Entity ID
   * @returns Array of field definitions
   * @private
   */
  private async loadEntityFields(entityId: string): Promise<FieldDefinition[]> {
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-fields');
    const fields = await this.databaseAdapter.query<FieldDefinition>(sql, [entityId, 1]);

    // Parse metadata for each field
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

  /**
   * Load entity permissions
   * @param entityId Entity ID
   * @param context User context
   * @returns Array of permission definitions
   * @private
   */
  private async loadEntityPermissions(entityId: string, context: Context): Promise<PermissionDefinition[]> {
    // Get user roles from context
    const userRoles = context.user?.roles || [];

    // If no roles, use 'public' role
    const roles = userRoles.length > 0 ? userRoles : ['public'];

    // Load permissions for entity and roles
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-permissions');
    const permissions = await this.databaseAdapter.query<PermissionDefinition>(sql, [entityId, roles.join(','), 1]);

    // Parse conditions for each permission
    for (const permission of permissions) {
      if (permission.conditions && typeof permission.conditions === 'string') {
        permission.conditions = safeJsonParse(permission.conditions, {});
      }
    }

    return permissions;
  }

  /**
   * Load entity views
   * @param entityId Entity ID
   * @returns Array of view definitions
   * @private
   */
  private async loadEntityViews(entityId: string): Promise<ViewDefinition[]> {
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-views');
    const views = await this.databaseAdapter.query<ViewDefinition>(sql, [entityId]);

    // Parse query and params for each view
    for (const view of views) {
      if (view.query_config && typeof view.query_config === 'string') {
        view.query_config = safeJsonParse(view.query_config, {});
      }
    }

    return views;
  }

  /**
   * Load entity workflows
   * @param entityId Entity ID
   * @returns Array of workflow definitions
   * @private
   */
  private async loadEntityWorkflows(entityId: string): Promise<WorkflowDefinition[]> {
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-workflows');
    const workflows = await this.databaseAdapter.query<WorkflowDefinition>(sql, [entityId, 1]);

    // Parse triggers, conditions, and actions for each workflow
    for (const workflow of workflows) {
      // Note: trigger_event is already a string, no need to parse

      if (workflow.conditions && typeof workflow.conditions === 'string') {
        workflow.conditions = safeJsonParse(workflow.conditions, {});
      }

      if (workflow.actions && typeof workflow.actions === 'string') {
        workflow.actions = safeJsonParse(workflow.actions, []);
      }
    }

    return workflows;
  }

  /**
   * Load entity RLS (Row-Level Security)
   * @param entityId Entity ID
   * @param context User context
   * @returns Array of RLS definitions
   * @private
   */
  private async loadEntityRLS(entityId: string, context: Context): Promise<RLSDefinition[]> {
    // Get user roles from context
    const userRoles = context.user?.roles || [];

    // If no roles, use 'public' role
    const roles = userRoles.length > 0 ? userRoles : ['public'];

    // Load RLS for entity and roles
    const sql = await this.sqlQueryLoader.loadQuery('load-entity-rls');
    const rlsRules = await this.databaseAdapter.query<RLSDefinition>(sql, [entityId, roles.join(','), 1]);

    // Parse rls_config for each RLS rule
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