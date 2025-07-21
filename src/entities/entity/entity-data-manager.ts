/**
 * EntityDataManager - Entity Data Operations
 * Responsible for entity data CRUD operations and table management
 * 
 * This class handles:
 * - Raw data operations (CRUD)
 * - Table creation and management
 * - Data transformation and system field management
 */
import { DatabaseManager } from '../../database/database-manager';
import { FluentQueryBuilder } from '../../database/fluent-query-builder';
import { EntityConfiguration, Context, RLSConditions } from '../../types';
import { generateId } from '../../utils/id-generation';
import { getCurrentTimestamp } from '../../utils/date-helpers';

/**
 * EntityDataManager class - Entity Data Operations
 * 
 * Single Responsibility: Handle entity data CRUD operations
 */
export class EntityDataManager {
  private databaseManager: DatabaseManager;

  /**
   * Create a new EntityDataManager instance
   * @param databaseManager Database manager
   */
  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  // === DATA ACCESS METHODS ===

  /**
   * Raw data insertion
   * @param entityConfig Entity configuration
   * @param data Entity data
   * @param context User context
   * @returns Created entity record
   */
  async insertData(
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

    // Use fluent database interface
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    const result = await this.db(tableName, tenantId).insert(data);

    if (result.changes === 0) {
      throw new Error(`Failed to create ${tableName} record`);
    }

    // For INSERT with RETURNING, we need to get the inserted record
    const insertedId = result.lastInsertId;
    if (insertedId) {
      const insertedRecord = await this.findByIdData(entityConfig, insertedId, context);
      return insertedRecord || { id: insertedId, ...data };
    }

    // Fallback: return the data with a generated ID
    return { id: generateId(), ...data };
  }

  /**
   * Raw data retrieval by ID
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Entity record or null if not found
   */
  async findByIdData(
    entityConfig: EntityConfiguration,
    id: string | number,
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<Record<string, any> | null> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface
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
   * Raw data update
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param data Update data
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Updated entity record
   */
  async updateData(
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

    // Use fluent database interface
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
    return await this.findByIdData(entityConfig, id, context, rlsConditions) || { id, ...data };
  }

  /**
   * Raw data deletion
   * @param entityConfig Entity configuration
   * @param id Record ID
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns True if record was deleted
   */
  async deleteData(
    entityConfig: EntityConfiguration,
    id: string | number,
    context: Context = {},
    rlsConditions?: RLSConditions
  ): Promise<boolean> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';
    
    // Use fluent database interface
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
   * Raw data finding with conditions
   * @param entityConfig Entity configuration
   * @param conditions Query conditions
   * @param options Query options
   * @param context User context
   * @param rlsConditions RLS conditions (optional)
   * @returns Array of entity records
   */
  async findData(
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
    
    // Start building query
    let query = this.db(tableName, tenantId);

    // Add RLS conditions first
    if (rlsConditions?.conditions) {
      for (const condition of rlsConditions.conditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    // Add search conditions
    for (const condition of conditions) {
      query = query.where(condition.field, condition.operator, condition.value);
    }

    // Add field selection
    if (options.fields && options.fields.length > 0) {
      query = query.select(options.fields);
    }

    // Add sorting
    if (options.sort && options.sort.length > 0) {
      for (const sort of options.sort) {
        query = query.orderBy(sort.field, sort.direction);
      }
    }

    // Add pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.get();
  }

  // === TABLE MANAGEMENT ===

  /**
   * Ensure entity table exists
   */
  async ensureEntityTable(entityConfig: EntityConfiguration): Promise<void> {
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

  // === PRIVATE HELPER METHODS ===

  /**
   * Create a fluent query builder for a table
   */
  private db(tableName: string, tenantId = 'default'): FluentQueryBuilder {
    return this.databaseManager.db(tableName, tenantId);
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
}