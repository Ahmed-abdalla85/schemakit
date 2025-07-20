/**
 * EntityManager
 * Responsible for CRUD operations on entities and schema management
 * 
 * Phase 2 Refactoring: Delegates query building to QueryManager
 * Phase 3 Refactoring: Integrated SchemaLoader functionality
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, ViewDefinition, WorkflowDefinition, RLSDefinition, Context, RLSConditions } from '../types';
import { QueryManager } from './query-manager';
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
 * Single responsibility: Handle CRUD operations on entities and schema management
 */
export class EntityManager {
  private databaseAdapter: DatabaseAdapter;
  private queryManager: QueryManager;
  
  // Schema loading and caching
  private entityCache: Map<string, EntityConfiguration> = new Map();
  private cacheEnabled = true;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Create a new EntityManager instance
   * @param databaseAdapter Database adapter
   * @param options Options
   */
  constructor(databaseAdapter: DatabaseAdapter, options?: { cacheEnabled?: boolean }) {
    this.databaseAdapter = databaseAdapter;
    this.queryManager = new QueryManager(databaseAdapter);
    this.cacheEnabled = options?.cacheEnabled !== false;
  }

  // === SCHEMA LOADING AND CACHING ===

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
      const result = await this.databaseAdapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?',
        ['table', 'system_entities']
      );
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
      const result = await this.databaseAdapter.query<{ value: string }>(
        'SELECT value FROM system_settings WHERE key = ?',
        ['version']
      );
      return result.length > 0 ? result[0].value : 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Ensure system tables exist
   */
  async ensureSystemTables(): Promise<void> {
    const systemTables = [
      'system_entities',
      'system_fields',
      'system_permissions',
      'system_views',
      'system_workflows',
      'system_rls',
      'system_settings'
    ];

    for (const table of systemTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        await this.createSystemTable(table);
      }
    }
  }

  /**
   * Reinstall SchemaKit
   * WARNING: This will delete all system tables and recreate them
   */
  async reinstall(): Promise<void> {
    const systemTables = [
      'system_entities',
      'system_fields',
      'system_permissions',
      'system_views',
      'system_workflows',
      'system_rls',
      'system_settings'
    ];

    // Drop all system tables
    for (const table of systemTables) {
      try {
        await this.databaseAdapter.execute(`DROP TABLE IF EXISTS ${table}`);
      } catch (e) {
        console.error(`Error dropping table ${table}:`, e);
      }
    }

    // Recreate system tables
    await this.ensureSystemTables();

    // Set version
    await this.databaseAdapter.execute(
      'INSERT INTO system_settings (key, value) VALUES (?, ?)',
      ['version', '1.0.0']
    );

    // Clear cache
    this.clearAllCache();
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

  // === CRUD OPERATIONS ===

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

    // Use QueryManager to build and execute insert query
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    const { sql, params } = this.queryManager.buildInsertQuery(tableName, tenantId, data);
    const result = await this.databaseAdapter.execute(sql, params);

    if (result.changes === 0) {
      throw new Error(`Failed to create ${tableName} record`);
    }

    // For INSERT with RETURNING, we need to get the inserted record
    // Since execute doesn't return the inserted record, we need to query for it
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
    
    // Use QueryManager to build and execute find by ID query
    const { sql, params } = this.queryManager.buildFindByIdQuery(tableName, tenantId, id);
    
    // Add RLS conditions if provided
    let finalSql = sql;
    let finalParams = [...params];
    
    if (rlsConditions?.sql) {
      // Append RLS conditions to WHERE clause
      const whereIndex = finalSql.indexOf('WHERE');
      if (whereIndex !== -1) {
        const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
        const afterWhere = finalSql.substring(whereIndex + 5);
        finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
        finalParams = [...finalParams, ...rlsConditions.params];
      }
    }

    const result = await this.databaseAdapter.query(finalSql, finalParams);
    return result.length > 0 ? result[0] : null;
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

    // Use QueryManager to build and execute update query
    const { sql, params } = this.queryManager.buildUpdateQuery(tableName, tenantId, id, data);
    
    // Add RLS conditions if provided
    let finalSql = sql;
    let finalParams = [...params];
    
    if (rlsConditions?.sql) {
      // Append RLS conditions to WHERE clause
      const whereIndex = finalSql.indexOf('WHERE');
      if (whereIndex !== -1) {
        const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
        const afterWhere = finalSql.substring(whereIndex + 5);
        finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
        finalParams = [...finalParams, ...rlsConditions.params];
      }
    }

    const result = await this.databaseAdapter.query(finalSql, finalParams);
    if (result.length === 0) {
      throw new Error(`Record not found or permission denied: ${tableName} with ID ${id}`);
    }
    return result[0];
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
    
    // Use QueryManager to build and execute delete query
    const { sql, params } = this.queryManager.buildDeleteQuery(tableName, tenantId, id);
    
    // Add RLS conditions if provided
    let finalSql = sql;
    let finalParams = [...params];
    
    if (rlsConditions?.sql) {
      // Append RLS conditions to WHERE clause
      const whereIndex = finalSql.indexOf('WHERE');
      if (whereIndex !== -1) {
        const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
        const afterWhere = finalSql.substring(whereIndex + 5);
        finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
        finalParams = [...finalParams, ...rlsConditions.params];
      }
    }

    const result = await this.databaseAdapter.execute(finalSql, finalParams);
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
    
    // Convert conditions to QueryFilter format
    const filters = conditions.map(condition => ({
      field: condition.field,
      value: condition.value,
      operator: condition.operator || 'eq'
    }));
    
    // Use QueryManager to build select query
    const { sql, params } = this.queryManager.buildSelectQuery(tableName, tenantId, filters, {
      sort: options.sort,
      limit: options.limit,
      offset: options.offset
    });
    
    // Add RLS conditions if provided
    let finalSql = sql;
    let finalParams = [...params];
    
    if (rlsConditions?.sql) {
      // Append RLS conditions to WHERE clause
      const whereIndex = finalSql.indexOf('WHERE');
      if (whereIndex !== -1) {
        const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
        const afterWhere = finalSql.substring(whereIndex + 5);
        finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
        finalParams = [...finalParams, ...rlsConditions.params];
      }
    }

    const result = await this.databaseAdapter.query(finalSql, finalParams);
    return result || [];
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
    
    // Convert conditions to QueryFilter format for QueryManager
    const filters = conditions.map(condition => ({
      field: condition.field,
      value: condition.value,
      operator: condition.operator || 'eq'
    }));
    
    // Use QueryManager to build and execute count query
    const { sql, params } = this.queryManager.buildCountQuery(tableName, tenantId, filters);
    
    // Add RLS conditions if provided
    let finalSql = sql;
    let finalParams = [...params];
    
    if (rlsConditions?.sql) {
      // Append RLS conditions to WHERE clause
      const whereIndex = finalSql.indexOf('WHERE');
      if (whereIndex !== -1) {
        const beforeWhere = finalSql.substring(0, whereIndex + 5); // +5 to include 'WHERE'
        const afterWhere = finalSql.substring(whereIndex + 5);
        finalSql = `${beforeWhere} ${afterWhere} AND (${rlsConditions.sql})`;
        finalParams = [...finalParams, ...rlsConditions.params];
      }
    }

    const result = await this.databaseAdapter.query(finalSql, finalParams);
    return result.length > 0 ? parseInt(result[0].count, 10) : 0;
  }

  // === TABLE MANAGEMENT ===

  /**
   * Ensure entity table exists
   * @param entityConfig Entity configuration
   */
  async ensureEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    const exists = await this.databaseAdapter.tableExists(tableName);
    if (!exists) {
      await this.createEntityTable(entityConfig);
    } else {
      // Check if table needs to be updated with new fields
      await this.updateEntityTable(entityConfig);
    }
  }

  /**
   * Create entity table
   * @param entityConfig Entity configuration
   */
  private async createEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
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

    await this.databaseAdapter.createTable(tableName, columns);
  }

  /**
   * Update entity table with new fields
   * @param entityConfig Entity configuration
   */
  private async updateEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    // Get existing columns
    const existingColumns = await this.databaseAdapter.getTableColumns(tableName);
    const existingColumnNames = new Set(existingColumns.map(col => col.name));
    
    // Find new fields that need to be added
    const newFields = entityConfig.fields.filter((field: any) => !existingColumnNames.has(field.name));
    
    if (newFields.length > 0) {
      // Add new columns one by one
      for (const field of newFields) {
        // Note: This is a simplified approach. In a real implementation,
        // you'd want to use ALTER TABLE ADD COLUMN statements
        console.log(`Would add column ${field.name} to table ${tableName}`, {
          type: this.getSqlType(field.type),
          notNull: field.is_required,
          unique: field.is_unique,
          default: field.default_value
        });
      }
    }
  }

  /**
   * Get SQL type for field type
   * @param fieldType Field type
   * @returns SQL type
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

  /**
   * Load entity definition
   * @param entityName Entity name
   * @returns Entity definition or null if not found
   * @private
   */
  private async loadEntityDefinition(entityName: string): Promise<EntityDefinition | null> {
    const entities = await this.databaseAdapter.query<EntityDefinition>(
      'SELECT * FROM system_entities WHERE name = ? AND is_active = ?',
      [entityName, 1]
    );

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
    const fields = await this.databaseAdapter.query<FieldDefinition>(
      'SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

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
    const permissions = await this.databaseAdapter.query<PermissionDefinition>(
      'SELECT * FROM system_permissions WHERE entity_id = ? AND role IN (?) AND is_active = ?',
      [entityId, roles.join(','), 1]
    );

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
    const views = await this.databaseAdapter.query<ViewDefinition>(
      'SELECT * FROM system_views WHERE entity_id = ?',
      [entityId]
    );

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
    const workflows = await this.databaseAdapter.query<WorkflowDefinition>(
      'SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, 1]
    );

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
    const rlsRules = await this.databaseAdapter.query<RLSDefinition>(
      'SELECT * FROM system_rls WHERE entity_id = ? AND role IN (?) AND is_active = ?',
      [entityId, roles.join(','), 1]
    );

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

  /**
   * Check if a table exists
   * @param tableName Table name
   * @returns True if table exists
   * @private
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.databaseAdapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?',
        ['table', tableName]
      );
      return result.length > 0 && result[0].count > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Create a system table
   * @param tableName Table name
   * @private
   */
  private async createSystemTable(tableName: string): Promise<void> {
    let sql = '';

    switch (tableName) {
      case 'system_entities':
        sql = `
          CREATE TABLE system_entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT,
            description TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
          )
        `;
        break;

      case 'system_fields':
        sql = `
          CREATE TABLE system_fields (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            type TEXT NOT NULL,
            is_required INTEGER DEFAULT 0,
            is_unique INTEGER DEFAULT 0,
            is_primary_key INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            default_value TEXT,
            validation TEXT,
            metadata TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
        break;

      case 'system_permissions':
        sql = `
          CREATE TABLE system_permissions (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
        break;

      case 'system_views':
        sql = `
          CREATE TABLE system_views (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            query TEXT,
            params TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
        break;

      case 'system_workflows':
        sql = `
          CREATE TABLE system_workflows (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            triggers TEXT,
            conditions TEXT,
            actions TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
        break;

      case 'system_rls':
        sql = `
          CREATE TABLE system_rls (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;
        break;

      case 'system_settings':
        sql = `
          CREATE TABLE system_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `;
        break;

      default:
        throw new Error(`Unknown system table: ${tableName}`);
    }

    await this.databaseAdapter.execute(sql);
  }

}