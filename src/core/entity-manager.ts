/**
 * EntityManager
 * Responsible for CRUD operations on entities and basic schema management
 * 
 * Simplified: Uses InstallManager for system tables, focuses on core functionality
 * Enhanced: Uses DatabaseManager as the main database gateway
 */
import { DatabaseManager } from '../database/database-manager';
import { FluentQueryBuilder } from '../database/fluent-query-builder';
import { EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, ViewDefinition, WorkflowDefinition, RLSDefinition, Context, RLSConditions } from '../types';
import { QueryManager } from '../database/query-manager';
import { InstallManager } from '../database/install-manager';
import { generateId } from '../utils/id-generation';
import { getCurrentTimestamp } from '../utils/date-helpers';
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
 * EntityManager class
 * Handles CRUD operations and schema management using existing patterns
 * Enhanced with EntityBuilder functionality and uses DatabaseManager as gateway
 */
export class EntityManager {
  private databaseManager: DatabaseManager;
  private queryManager: QueryManager;
  private installManager: InstallManager;
  
  // Schema loading and caching
  private entityCache: Map<string, EntityConfiguration> = new Map();
  
  // EntityBuilder functionality merged in
  private entityApiCache = new Map<string, any>();
  
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

  // === FLUENT DATABASE INTERFACE (CodeIgniter-style) ===

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

  // === ENTITY BUILDER FUNCTIONALITY (merged from EntityBuilder) ===

  /**
   * Returns a fluent EntityAPI instance for the given entity name with optional tenant context.
   * @param entityName Entity name
   * @param tenantId Tenant ID (defaults to 'default')
   */
  entity(entityName: string, tenantId: string = 'default'): any {
    const cacheKey = `${tenantId}:${entityName}`;
    
    if (!this.entityApiCache.has(cacheKey)) {
      // Create EntityAPI instance with proper dependency injection
      const { EntityAPI } = require('./entity-api');
      const { ValidationManager } = require('./validation-manager');
      const { PermissionManager } = require('./permission-manager');
      const { WorkflowManager } = require('./workflow-manager');
      
      // Create the required managers if they don't exist
      const validationManager = new ValidationManager();
      const permissionManager = new PermissionManager(this.databaseManager.getAdapter());
      const workflowManager = new WorkflowManager(this.databaseManager.getAdapter());
      
      const entityApi = new EntityAPI(
        entityName,
        this,
        validationManager,
        permissionManager,
        workflowManager,
        tenantId
      );
      this.entityApiCache.set(cacheKey, entityApi);
    }
    
    const cachedEntity = this.entityApiCache.get(cacheKey);
    if (!cachedEntity) {
      throw new Error(`Failed to retrieve cached entity API for ${cacheKey}`);
    }
    return cachedEntity;
  }

  /**
   * Clears the entity API cache for a specific entity or all entities.
   */
  clearEntityApiCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      const cacheKey = `${tenantId}:${entityName}`;
      this.entityApiCache.delete(cacheKey);
    } else if (entityName) {
      // Clear all tenant variants of this entity
      const keysToDelete = Array.from(this.entityApiCache.keys()).filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => this.entityApiCache.delete(key));
    } else {
      this.entityApiCache.clear();
    }
  }

  // === SCHEMA MANAGEMENT ===

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
      entity, fields, permissions, views, workflows, rls
    };

    // Cache the result
    if (this.cacheEnabled) {
      this.entityCache.set(entityName, entityConfig);
    }

    return entityConfig;
  }

  /**
   * Reload entity configuration (bypass cache)
   */
  async reloadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    this.clearEntityCache(entityName);
    return this.loadEntity(entityName, context);
  }

  /**
   * Check if SchemaKit is installed
   */
  async isSchemaKitInstalled(): Promise<boolean> {
    return this.installManager.isInstalled();
  }

  /**
   * Get SchemaKit version
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.databaseManager.query<{ value: string }>(
        'SELECT value FROM system_settings WHERE key = ?', ['version']
      );
      return result.length > 0 ? result[0].value : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Ensure system tables exist - Only call during initialization
   */
  async ensureSystemTables(): Promise<void> {
    await this.installManager.ensureReady();
  }

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
  clearEntityCache(entityName?: string, tenantId?: string): void {
    if (entityName) {
      this.entityCache.delete(entityName);
    } else {
      this.entityCache.clear();
    }
    
    // Also clear entity API cache
    this.clearEntityApiCache(entityName, tenantId);
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    this.entityCache.clear();
    this.entityApiCache.clear();
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

  // === CRUD OPERATIONS (Simplified - removed ensureReady calls) ===

  /**
   * Create a new entity record
   * @param entityConfig Entity configuration
   * @param data Entity data
   * @param context User context
   * @returns Created entity record
   */
  async create(
    entityConfig: EntityConfiguration,
    data: Record<string, any>,
    context: Context = {}
  ): Promise<Record<string, any>> {
    // Ensure entity table exists
    await this.ensureEntityTable(entityConfig);

    // Generate ID if not provided
    if (!data.id) {
      data.id = generateId();
    }

    // Add system fields
    const timestamp = getCurrentTimestamp();
    data.created_at = timestamp;
    data.updated_at = timestamp;

    // Add creator ID if available in context
    if (context.user?.id) {
      data.created_by = context.user.id;
      data.updated_by = context.user.id;
    }

    // Use fluent database interface (CodeIgniter-style)
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    const result = await this.db(tableName, tenantId).insert(data);

    if (result.changes === 0) {
      throw new Error(`Failed to create ${tableName} record`);
    }

    // For INSERT with RETURNING, we need to get the inserted record
    const insertedId = result.lastInsertId;
    if (insertedId) {
      const insertedRecord = await this.findById(entityConfig, insertedId, context);
      return insertedRecord || { id: insertedId, ...data };
    }

    // Fallback: return the data with a generated ID
    return { id: generateId(), ...data };
  }

  /**
   * Find entity record by ID
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Entity record or null if not found
   */
  async findById(
    entityConfig: EntityConfiguration,
    id: string | number,
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<Record<string, any> | null> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface (CodeIgniter-style)
    let query = this.db(tableName, tenantId).where('id', id);
    
    // Add RLS conditions if provided
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    return await query.first();
  }

  /**
   * Update entity record
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param data Update data
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Updated entity record
   */
  async update(
    entityConfig: EntityConfiguration,
    id: string | number,
    data: Record<string, any>,
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<Record<string, any>> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Add system fields
    data.updated_at = getCurrentTimestamp();
    
    // Add updater ID if available in context
    if (context.user?.id) {
      data.updated_by = context.user.id;
    }

    // Remove ID from update data if present
    if ('id' in data) {
      delete data.id;
    }

    // Use fluent database interface (CodeIgniter-style)
    let query = this.db(tableName, tenantId).where('id', id);
    
    // Add RLS conditions if provided
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    const result = await query.update(data);
    if (result.changes === 0) {
      throw new Error(`Record not found or permission denied: ${tableName} with ID ${id}`);
    }

    // Return updated record
    return await this.findById(entityConfig, id, context, rlsConditions) || { id, ...data };
  }

  /**
   * Delete entity record
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns True if record was deleted
   */
  async delete(
    entityConfig: EntityConfiguration,
    id: string | number,
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<boolean> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface (CodeIgniter-style)
    let query = this.db(tableName, tenantId).where('id', id);
    
    // Add RLS conditions if provided
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    const result = await query.delete();
    return result.changes > 0;
  }

  /**
   * Find entity records with conditions
   * @param entityConfig Entity configuration
   * @param conditions Query conditions
   * @param options Query options
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Array of entity records
   */
  async find(
    entityConfig: EntityConfiguration,
    conditions: any[] = [],
    options: {
      fields?: string[];
      sort?: { field: string; direction: 'ASC' | 'DESC' }[];
      limit?: number;
      offset?: number;
    } = {},
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<Record<string, any>[]> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface (CodeIgniter-style)
    let query = this.db(tableName, tenantId);
    
    // Apply field selection
    if (options.fields && options.fields.length > 0) {
      query = query.select(options.fields);
    }
    
    // Apply conditions
    for (const condition of conditions) {
      query = query.where(condition.field, condition.operator || '=', condition.value);
    }
    
    // Add RLS conditions if provided
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }
    
    // Apply sorting
    if (options.sort) {
      for (const sort of options.sort) {
        query = query.orderBy(sort.field, sort.direction);
      }
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit, options.offset);
    }

    return await query.get();
  }

  /**
   * Count entity records with conditions
   * @param entityConfig Entity configuration
   * @param conditions Query conditions
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Count of records
   */
  async count(
    entityConfig: EntityConfiguration,
    conditions: any[] = [],
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<number> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface (CodeIgniter-style)
    let query = this.db(tableName, tenantId);
    
    // Apply conditions
    for (const condition of conditions) {
      query = query.where(condition.field, condition.operator || '=', condition.value);
    }
    
    // Add RLS conditions if provided
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    return await query.count();
  }

  // === MINIMAL TABLE MANAGEMENT ===

  /**
   * Ensure entity table exists
   */
  private async ensureEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    const exists = await this.databaseManager.tableExists(tableName);
    
    if (!exists) {
      // Build column definitions
      const columns = entityConfig.fields.map((field: any) => ({
        name: field.name,
        type: this.getSqlType(field.type),
        primaryKey: field.name === 'id',
        notNull: field.is_required || field.name === 'id',
        unique: field.is_unique,
        default: field.default_value
      }));

      // Add system columns
      columns.push(
        { name: 'created_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined },
        { name: 'updated_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined },
        { name: 'created_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined },
        { name: 'updated_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined }
      );

      await this.databaseManager.createTable(tableName, columns);
    }
  }

  /**
   * Get SQL type for field type
   */
  private getSqlType(fieldType: string): string {
    switch (fieldType) {
      case 'string':
      case 'email':
      case 'url':
      case 'text':
      case 'uuid':
        return 'VARCHAR(255)';
      case 'number':
        return 'DECIMAL(10,2)';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
        return 'DATETIME';
      default:
        return 'VARCHAR(255)';
    }
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