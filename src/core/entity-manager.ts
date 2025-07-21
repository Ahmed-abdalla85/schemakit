/**
 * EntityManager
 * Responsible for CRUD operations on entities
 * 
 * Refactored: Focused only on CRUD operations
 * Schema management moved to SchemaManager
 * Table management moved to TableManager
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context, RLSConditions } from '../types';
import { QueryManager } from './query-manager';
import { SchemaManager, CacheStats } from './schema-manager';
import { TableManager } from './table-manager';

// Re-export CacheStats for backward compatibility
export { CacheStats };
import { generateId } from '../utils/id-generation';
import { getCurrentTimestamp } from '../utils/date-helpers';

/**
 * EntityManager class
 * Single responsibility: Handle CRUD operations on entities
 */
export class EntityManager {
  private databaseAdapter: DatabaseAdapter;
  private queryManager: QueryManager;
  private schemaManager: SchemaManager;
  private tableManager: TableManager;

  /**
   * Create a new EntityManager instance
   * @param databaseAdapter Database adapter
   * @param options Options
   */
  constructor(databaseAdapter: DatabaseAdapter, options?: { cacheEnabled?: boolean }) {
    this.databaseAdapter = databaseAdapter;
    this.queryManager = new QueryManager(databaseAdapter);
    this.schemaManager = new SchemaManager(databaseAdapter, options);
    this.tableManager = new TableManager(databaseAdapter);
  }

  // === SCHEMA MANAGEMENT (Delegated) ===

  /**
   * Load entity configuration
   * @param entityName Entity name
   * @param context User context
   * @returns Entity configuration
   */
  async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    return this.schemaManager.loadEntity(entityName, context);
  }

  /**
   * Reload entity configuration (bypass cache)
   * @param entityName Entity name
   * @param context User context
   * @returns Entity configuration
   */
  async reloadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    return this.schemaManager.reloadEntity(entityName, context);
  }

  /**
   * Check if SchemaKit is installed
   * @returns True if installed
   */
  async isSchemaKitInstalled(): Promise<boolean> {
    return this.schemaManager.isSchemaKitInstalled();
  }

  /**
   * Get SchemaKit version
   * @returns Version string
   */
  async getVersion(): Promise<string> {
    return this.schemaManager.getVersion();
  }

  /**
   * Ensure system tables exist
   */
  async ensureSystemTables(): Promise<void> {
    return this.tableManager.ensureSystemTables();
  }

  /**
   * Reinstall SchemaKit
   * WARNING: This will delete all system tables and recreate them
   */
  async reinstall(): Promise<void> {
    await this.tableManager.reinstall();
    this.schemaManager.clearAllCache();
  }

  /**
   * Clear entity cache for a specific entity or all entities
   * @param entityName Optional entity name to clear
   */
  clearEntityCache(entityName?: string): void {
    this.schemaManager.clearEntityCache(entityName);
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    this.schemaManager.clearAllCache();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats() {
    return this.schemaManager.getCacheStats();
  }

  /**
   * Get all loaded entities
   * @returns Array of entity names
   */
  getLoadedEntities(): string[] {
    return this.schemaManager.getLoadedEntities();
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
    await this.tableManager.ensureEntityTable(entityConfig);

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

}