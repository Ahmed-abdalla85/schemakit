/**
 * SchemaKit - Main API facade
 */
import { DatabaseAdapter, ColumnDefinition } from './database/adapter';
import { 
  Context, 
  EntityConfiguration, 
  QueryResult, 
  EntityDefinition, 
  FieldDefinition, 
  PermissionDefinition, 
  ViewDefinition, 
  WorkflowDefinition, 
  RLSDefinition 
} from './types';
import { SchemaKitError } from './errors';

/**
 * SchemaKit options
 */
export interface SchemaKitOptions {
  adapter?: {
    type?: string;
    config?: Record<string, any>;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  [key: string]: any;
}

/**
 * SchemaKit - Dynamic entity management system
 */
export class SchemaKit {
  private databaseAdapter: DatabaseAdapter;
  private options: SchemaKitOptions;
  private entityCache: Map<string, EntityConfiguration> = new Map();

  /**
   * Create a new SchemaKit instance
   * @param options Configuration options
   */
  constructor(options: SchemaKitOptions = {}) {
    this.options = {
      adapter: {
        type: 'sqlite',
        config: {}
      },
      cache: {
        enabled: true,
        ttl: 3600000 // 1 hour
      },
      ...options
    };

    // We'll initialize the adapter in the init method
    this.databaseAdapter = null as unknown as DatabaseAdapter;
  }
  
  /**
   * Initialize SchemaKit
   * This method must be called before using any async methods
   */
  async init(): Promise<SchemaKit> {
    // Create database adapter asynchronously
    const adapterType = this.options.adapter?.type || 'sqlite';
    const adapterConfig = this.options.adapter?.config || {};
    this.databaseAdapter = await DatabaseAdapter.create(adapterType, adapterConfig);
    
    // Connect to the database
    await this.databaseAdapter.connect();
    
    return this;
  }
  
  /**
   * Check if SchemaKit is connected to the database
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.databaseAdapter?.isConnected() || false;
  }

  /**
   * Load entity configuration from database
   * @param entityName Entity name
   * @param context User context
   */
  async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    // Check if entity is already in cache
    if (this.options.cache?.enabled && this.entityCache.has(entityName)) {
      return this.entityCache.get(entityName)!;
    }

    try {
      // Ensure database connection
      if (!this.databaseAdapter.isConnected()) {
        await this.databaseAdapter.connect();
      }

      // Check if system tables exist, create them if not
      await this.ensureSystemTables();

      // Load entity definition
      const entityDef = await this.loadEntityDefinition(entityName);
      if (!entityDef) {
        throw new SchemaKitError(`Entity '${entityName}' not found`);
      }

      // Load fields
      const fields = await this.loadEntityFields(entityDef.id);

      // Load permissions
      const permissions = await this.loadEntityPermissions(entityDef.id, context);

      // Load views
      const views = await this.loadEntityViews(entityDef.id);

      // Load workflows
      const workflows = await this.loadEntityWorkflows(entityDef.id);

      // Load RLS (Row Level Security)
      const rls = await this.loadEntityRLS(entityDef.id, context);

      // Create entity configuration
      const entityConfig: EntityConfiguration = {
        entity: entityDef,
        fields,
        permissions,
        views,
        workflows,
        rls
      };

      // Store in cache if enabled
      if (this.options.cache?.enabled) {
        this.entityCache.set(entityName, entityConfig);
      }

      return entityConfig;
    } catch (error) {
      throw new SchemaKitError(`Failed to load entity '${entityName}': ${error}`);
    }
  }

  /**
   * Reload entity configuration from database
   * @param entityName Entity name
   */
  async reloadEntity(entityName: string): Promise<EntityConfiguration> {
    // Remove from cache if present
    if (this.entityCache.has(entityName)) {
      this.entityCache.delete(entityName);
    }

    // Load fresh entity configuration
    return this.loadEntity(entityName);
  }

  /**
   * Ensure system tables exist
   * @private
   */
  private async ensureSystemTables(): Promise<void> {
    // Check if system_entities table exists
    const entitiesTableExists = await this.databaseAdapter.tableExists('system_entities');
    if (!entitiesTableExists) {
      // Create system_entities table
      await this.databaseAdapter.createTable('system_entities', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'name', type: 'TEXT', notNull: true, unique: true },
        { name: 'table_name', type: 'TEXT', notNull: true },
        { name: 'display_name', type: 'TEXT', notNull: true },
        { name: 'description', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true },
        { name: 'metadata', type: 'TEXT' } // JSON string
      ]);
    }

    // Check if system_fields table exists
    const fieldsTableExists = await this.databaseAdapter.tableExists('system_fields');
    if (!fieldsTableExists) {
      // Create system_fields table
      await this.databaseAdapter.createTable('system_fields', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true },
        { name: 'is_required', type: 'BOOLEAN', notNull: true, default: false },
        { name: 'is_unique', type: 'BOOLEAN', notNull: true, default: false },
        { name: 'default_value', type: 'TEXT' },
        { name: 'validation_rules', type: 'TEXT' }, // JSON string
        { name: 'display_name', type: 'TEXT', notNull: true },
        { name: 'description', type: 'TEXT' },
        { name: 'order_index', type: 'INTEGER', notNull: true, default: 0 },
        { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
        { name: 'reference_entity', type: 'TEXT' },
        { name: 'metadata', type: 'TEXT' } // JSON string
      ]);
    }

    // Check if system_permissions table exists
    const permissionsTableExists = await this.databaseAdapter.tableExists('system_permissions');
    if (!permissionsTableExists) {
      // Create system_permissions table
      await this.databaseAdapter.createTable('system_permissions', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
        { name: 'role', type: 'TEXT', notNull: true },
        { name: 'action', type: 'TEXT', notNull: true },
        { name: 'conditions', type: 'TEXT' }, // JSON string
        { name: 'is_allowed', type: 'BOOLEAN', notNull: true, default: true },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'field_permissions', type: 'TEXT' } // JSON string
      ]);
    }

    // Check if system_views table exists
    const viewsTableExists = await this.databaseAdapter.tableExists('system_views');
    if (!viewsTableExists) {
      // Create system_views table
      await this.databaseAdapter.createTable('system_views', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'query_config', type: 'TEXT', notNull: true }, // JSON string
        { name: 'fields', type: 'TEXT', notNull: true }, // JSON string
        { name: 'is_default', type: 'BOOLEAN', notNull: true, default: false },
        { name: 'created_by', type: 'TEXT' },
        { name: 'is_public', type: 'BOOLEAN', notNull: true, default: false },
        { name: 'metadata', type: 'TEXT' } // JSON string
      ]);
    }

    // Check if system_workflows table exists
    const workflowsTableExists = await this.databaseAdapter.tableExists('system_workflows');
    if (!workflowsTableExists) {
      // Create system_workflows table
      await this.databaseAdapter.createTable('system_workflows', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'trigger_event', type: 'TEXT', notNull: true },
        { name: 'conditions', type: 'TEXT' }, // JSON string
        { name: 'actions', type: 'TEXT', notNull: true }, // JSON string
        { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
        { name: 'order_index', type: 'INTEGER', notNull: true, default: 0 },
        { name: 'metadata', type: 'TEXT' } // JSON string
      ]);
    }

    // Check if system_rls table exists
    const rlsTableExists = await this.databaseAdapter.tableExists('system_rls');
    if (!rlsTableExists) {
      // Create system_rls table
      await this.databaseAdapter.createTable('system_rls', [
        { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
        { name: 'entity_id', type: 'TEXT', notNull: true, references: { table: 'system_entities', column: 'id', onDelete: 'CASCADE' } },
        { name: 'role', type: 'TEXT', notNull: true },
        { name: 'view_id', type: 'TEXT' },
        { name: 'rls_config', type: 'TEXT', notNull: true }, // JSON string
        { name: 'is_active', type: 'BOOLEAN', notNull: true, default: true },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ]);
    }
  }

  /**
   * Load entity definition from database
   * @param entityName Entity name
   * @private
   */
  private async loadEntityDefinition(entityName: string): Promise<EntityDefinition | null> {
    const entities = await this.databaseAdapter.query<EntityDefinition>(
      'SELECT * FROM system_entities WHERE name = ? AND is_active = ?',
      [entityName, true]
    );

    if (entities.length === 0) {
      return null;
    }

    const entity = entities[0];
    
    // Parse metadata JSON if present
    if (entity.metadata && typeof entity.metadata === 'string') {
      try {
        entity.metadata = JSON.parse(entity.metadata);
      } catch (e) {
        // If JSON parsing fails, keep as string
      }
    }

    return entity;
  }

  /**
   * Load entity fields from database
   * @param entityId Entity ID
   * @private
   */
  private async loadEntityFields(entityId: string): Promise<FieldDefinition[]> {
    const fields = await this.databaseAdapter.query<FieldDefinition>(
      'SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, true]
    );

    // Parse JSON fields
    return fields.map(field => {
      // Parse validation_rules JSON if present
      if (field.validation_rules && typeof field.validation_rules === 'string') {
        try {
          field.validation_rules = JSON.parse(field.validation_rules);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      // Parse metadata JSON if present
      if (field.metadata && typeof field.metadata === 'string') {
        try {
          field.metadata = JSON.parse(field.metadata);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      return field;
    });
  }

  /**
   * Load entity permissions from database
   * @param entityId Entity ID
   * @param context User context
   * @private
   */
  private async loadEntityPermissions(entityId: string, context: Context): Promise<PermissionDefinition[]> {
    // Get user roles from context
    const userRoles = context.user?.roles || [];
    
    // If no roles specified, load all permissions
    const params = [entityId];
    let roleCondition = '';
    
    if (userRoles.length > 0) {
      roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
      params.push(...userRoles);
    }

    const permissions = await this.databaseAdapter.query<PermissionDefinition>(
      `SELECT * FROM system_permissions WHERE entity_id = ? ${roleCondition}`,
      params
    );

    // Parse JSON fields
    return permissions.map(permission => {
      // Parse conditions JSON if present
      if (permission.conditions && typeof permission.conditions === 'string') {
        try {
          permission.conditions = JSON.parse(permission.conditions);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      // Parse field_permissions JSON if present
      if (permission.field_permissions && typeof permission.field_permissions === 'string') {
        try {
          permission.field_permissions = JSON.parse(permission.field_permissions);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      return permission;
    });
  }

  /**
   * Load entity views from database
   * @param entityId Entity ID
   * @private
   */
  private async loadEntityViews(entityId: string): Promise<ViewDefinition[]> {
    const views = await this.databaseAdapter.query<ViewDefinition>(
      'SELECT * FROM system_views WHERE entity_id = ?',
      [entityId]
    );

    // Parse JSON fields
    return views.map(view => {
      // Parse query_config JSON
      if (view.query_config && typeof view.query_config === 'string') {
        try {
          view.query_config = JSON.parse(view.query_config);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      // Parse fields JSON
      if (view.fields && typeof view.fields === 'string') {
        try {
          view.fields = JSON.parse(view.fields);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      // Parse metadata JSON if present
      if (view.metadata && typeof view.metadata === 'string') {
        try {
          view.metadata = JSON.parse(view.metadata);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      return view;
    });
  }

  /**
   * Load entity workflows from database
   * @param entityId Entity ID
   * @private
   */
  private async loadEntityWorkflows(entityId: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.databaseAdapter.query<WorkflowDefinition>(
      'SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC',
      [entityId, true]
    );

    // Parse JSON fields
    return workflows.map(workflow => {
      // Parse conditions JSON if present
      if (workflow.conditions && typeof workflow.conditions === 'string') {
        try {
          workflow.conditions = JSON.parse(workflow.conditions);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      // Parse actions JSON
      if (workflow.actions && typeof workflow.actions === 'string') {
        try {
          workflow.actions = JSON.parse(workflow.actions);
        } catch (e) {
          // If JSON parsing fails, keep as string or empty array
          workflow.actions = [];
        }
      }

      // Parse metadata JSON if present
      if (workflow.metadata && typeof workflow.metadata === 'string') {
        try {
          workflow.metadata = JSON.parse(workflow.metadata);
        } catch (e) {
          // If JSON parsing fails, keep as string
        }
      }

      return workflow;
    });
  }

  /**
   * Load entity RLS (Row Level Security) from database
   * @param entityId Entity ID
   * @param context User context
   * @private
   */
  private async loadEntityRLS(entityId: string, context: Context): Promise<RLSDefinition[]> {
    // Get user roles from context
    const userRoles = context.user?.roles || [];
    
    // If no roles specified, load all RLS rules
    const params = [entityId, true];
    let roleCondition = '';
    
    if (userRoles.length > 0) {
      roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
      params.push(...userRoles);
    }

    const rlsRules = await this.databaseAdapter.query<RLSDefinition>(
      `SELECT * FROM system_rls WHERE entity_id = ? AND is_active = ? ${roleCondition}`,
      params
    );

    // Parse JSON fields
    return rlsRules.map(rls => {
      // Parse rls_config JSON
      if (rls.rls_config && typeof rls.rls_config === 'string') {
        try {
          rls.rls_config = JSON.parse(rls.rls_config);
        } catch (e) {
          // If JSON parsing fails, use default structure
          rls.rls_config = {
            relationbetweenconditions: 'and',
            conditions: []
          };
        }
      }

      return rls;
    });
  }

  /**
   * Get loaded entity names
   */
  getLoadedEntities(): string[] {
    return Array.from(this.entityCache.keys());
  }

  /**
   * Create a new entity instance
   * @param entityName Entity name
   * @param data Entity data
   * @param context User context
   */
  async create(entityName: string, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'create', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for creating ${entityName}`);
      }
      
      // Validate data against entity schema
      const validationResult = this.validateEntityData(entityConfig, data, 'create');
      if (!validationResult.isValid) {
        throw new SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
      }
      
      // Ensure entity table exists
      await this.ensureEntityTable(entityConfig);
      
      // Prepare data for insertion
      const insertData = this.prepareDataForInsert(entityConfig, data);
      
      // Generate ID if not provided
      if (!insertData.id) {
        insertData.id = this.generateId();
      }
      
      // Add timestamps
      const now = new Date().toISOString();
      insertData.created_at = now;
      insertData.updated_at = now;
      
      // Execute pre-create workflows
      await this.executeWorkflows(entityConfig, 'create', null, insertData, context);
      
      // Insert data into database
      const columns = Object.keys(insertData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => insertData[col]);
      
      const sql = `INSERT INTO ${entityConfig.entity.table_name} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      await this.databaseAdapter.execute(sql, values);
      
      // Execute post-create workflows
      await this.executeWorkflows(entityConfig, 'create', null, insertData, context);
      
      return insertData;
    } catch (error) {
      throw new SchemaKitError(`Failed to create ${entityName}: ${error}`);
    }
  }

  /**
   * Find entity instance by ID
   * @param entityName Entity name
   * @param id Entity ID
   * @param context User context
   */
  async findById(entityName: string, id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Ensure entity table exists
      await this.ensureEntityTable(entityConfig);
      
      // Apply RLS (Row Level Security) conditions
      const rlsConditions = this.buildRLSConditions(entityConfig, context);
      
      // Build query
      let sql = `SELECT * FROM ${entityConfig.entity.table_name} WHERE id = ?`;
      const params: any[] = [id];
      
      // Add RLS conditions if any
      if (rlsConditions.sql) {
        sql += ` AND (${rlsConditions.sql})`;
        params.push(...rlsConditions.params);
      }
      
      // Execute query
      const results = await this.databaseAdapter.query(sql, params);
      
      if (results.length === 0) {
        return null;
      }
      
      // Process result
      const result = this.processEntityResult(entityConfig, results[0]);
      
      return result;
    } catch (error) {
      throw new SchemaKitError(`Failed to find ${entityName} with id ${id}: ${error}`);
    }
  }
  
  /**
   * Validate entity data against schema
   * @param entityConfig Entity configuration
   * @param data Data to validate
   * @param operation Operation type (create, update)
   * @private
   */
  private validateEntityData(
    entityConfig: EntityConfiguration, 
    data: Record<string, any>, 
    operation: 'create' | 'update'
  ): { isValid: boolean; errors: { field: string; code: string; message: string; value?: any }[] } {
    const errors: { field: string; code: string; message: string; value?: any }[] = [];
    
    // Validate each field
    for (const field of entityConfig.fields) {
      const value = data[field.name];
      
      // Check required fields (only for create operation or if field is present in update)
      if (field.is_required && (operation === 'create' || data.hasOwnProperty(field.name))) {
        if (value === undefined || value === null || value === '') {
          errors.push({
            field: field.name,
            code: 'required',
            message: `Field '${field.name}' is required`,
            value
          });
          continue;
        }
      }
      
      // Skip validation if value is not provided
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be a string`,
              value
            });
          } else if (field.validation_rules) {
            // String-specific validations
            if (field.validation_rules.minLength && value.length < field.validation_rules.minLength) {
              errors.push({
                field: field.name,
                code: 'minLength',
                message: `Field '${field.name}' must be at least ${field.validation_rules.minLength} characters`,
                value
              });
            }
            
            if (field.validation_rules.maxLength && value.length > field.validation_rules.maxLength) {
              errors.push({
                field: field.name,
                code: 'maxLength',
                message: `Field '${field.name}' must be at most ${field.validation_rules.maxLength} characters`,
                value
              });
            }
            
            if (field.validation_rules.pattern) {
              const regex = new RegExp(field.validation_rules.pattern);
              if (!regex.test(value)) {
                errors.push({
                  field: field.name,
                  code: 'pattern',
                  message: `Field '${field.name}' does not match required pattern`,
                  value
                });
              }
            }
          }
          break;
          
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be a number`,
              value
            });
          } else if (field.validation_rules) {
            // Number-specific validations
            if (field.validation_rules.min !== undefined && value < field.validation_rules.min) {
              errors.push({
                field: field.name,
                code: 'min',
                message: `Field '${field.name}' must be at least ${field.validation_rules.min}`,
                value
              });
            }
            
            if (field.validation_rules.max !== undefined && value > field.validation_rules.max) {
              errors.push({
                field: field.name,
                code: 'max',
                message: `Field '${field.name}' must be at most ${field.validation_rules.max}`,
                value
              });
            }
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be a boolean`,
              value
            });
          }
          break;
          
        case 'date':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be a valid date`,
              value
            });
          }
          break;
          
        case 'array':
          if (!Array.isArray(value)) {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be an array`,
              value
            });
          } else if (field.validation_rules) {
            // Array-specific validations
            if (field.validation_rules.minItems && value.length < field.validation_rules.minItems) {
              errors.push({
                field: field.name,
                code: 'minItems',
                message: `Field '${field.name}' must have at least ${field.validation_rules.minItems} items`,
                value
              });
            }
            
            if (field.validation_rules.maxItems && value.length > field.validation_rules.maxItems) {
              errors.push({
                field: field.name,
                code: 'maxItems',
                message: `Field '${field.name}' must have at most ${field.validation_rules.maxItems} items`,
                value
              });
            }
          }
          break;
          
        case 'json':
          try {
            if (typeof value === 'string') {
              JSON.parse(value);
            } else if (typeof value !== 'object') {
              throw new Error('Not an object');
            }
          } catch (e) {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be valid JSON`,
              value
            });
          }
          break;
          
        case 'reference':
          // Reference validation would require checking if the referenced entity exists
          // This is a simplified version
          if (typeof value !== 'string' && typeof value !== 'number') {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be a valid reference ID`,
              value
            });
          }
          break;
      }
      
      // Check uniqueness if required
      if (field.is_unique && value !== undefined && value !== null) {
        // This would require a database check, which we'll skip for now
        // In a real implementation, we would check if the value already exists
      }
      
      // Custom validation rules
      if (field.validation_rules && field.validation_rules.custom) {
        // In a real implementation, we would execute custom validation functions
        // This is a placeholder for custom validation
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Prepare data for insertion
   * @param entityConfig Entity configuration
   * @param data Data to prepare
   * @private
   */
  private prepareDataForInsert(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Process each field
    for (const field of entityConfig.fields) {
      let value = data[field.name];
      
      // Apply default value if not provided
      if ((value === undefined || value === null) && field.default_value !== undefined) {
        value = field.default_value;
      }
      
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Convert values based on field type
      switch (field.type) {
        case 'date':
          if (value instanceof Date) {
            value = value.toISOString();
          }
          break;
          
        case 'json':
        case 'array':
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          break;
      }
      
      result[field.name] = value;
    }
    
    return result;
  }
  
  /**
   * Process entity result from database
   * @param entityConfig Entity configuration
   * @param data Data from database
   * @private
   */
  private processEntityResult(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...data };
    
    // Process each field
    for (const field of entityConfig.fields) {
      const value = data[field.name];
      
      // Skip null or undefined values
      if (value === null || value === undefined) {
        continue;
      }
      
      // Convert values based on field type
      switch (field.type) {
        case 'date':
          result[field.name] = new Date(value);
          break;
          
        case 'json':
        case 'array':
          if (typeof value === 'string') {
            try {
              result[field.name] = JSON.parse(value);
            } catch (e) {
              // If parsing fails, keep original value
            }
          }
          break;
          
        case 'number':
          result[field.name] = Number(value);
          break;
          
        case 'boolean':
          // Convert various boolean representations
          if (value === 'true' || value === '1' || value === 1) {
            result[field.name] = true;
          } else if (value === 'false' || value === '0' || value === 0) {
            result[field.name] = false;
          }
          break;
      }
    }
    
    return result;
  }
  
  /**
   * Generate a unique ID
   * @private
   */
  private generateId(): string {
    // Simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Ensure entity table exists
   * @param entityConfig Entity configuration
   * @private
   */
  private async ensureEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    // Check if table exists
    const tableExists = await this.databaseAdapter.tableExists(tableName);
    if (tableExists) {
      return;
    }
    
    // Create table columns
    const columns: ColumnDefinition[] = [
      { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'updated_at', type: 'TEXT', notNull: true }
    ];
    
    // Add columns for each field
    for (const field of entityConfig.fields) {
      // Skip special fields that are already added
      if (['id', 'created_at', 'updated_at'].includes(field.name)) {
        continue;
      }
      
      // Map field type to SQL type
      let sqlType: string;
      switch (field.type) {
        case 'string':
          sqlType = 'TEXT';
          break;
        case 'number':
          sqlType = 'REAL';
          break;
        case 'boolean':
          sqlType = 'INTEGER';
          break;
        case 'date':
          sqlType = 'TEXT';
          break;
        case 'json':
        case 'array':
          sqlType = 'TEXT';
          break;
        case 'reference':
          sqlType = 'TEXT';
          break;
        default:
          sqlType = 'TEXT';
      }
      
      // Create column definition
      const column: ColumnDefinition = {
        name: field.name,
        type: sqlType,
        notNull: field.is_required,
        unique: field.is_unique
      };
      
      // Add default value if specified
      if (field.default_value !== undefined) {
        column.default = field.default_value;
      }
      
      // Add reference if specified
      if (field.type === 'reference' && field.reference_entity) {
        column.references = {
          table: `entity_${field.reference_entity}`,
          column: 'id'
        };
      }
      
      columns.push(column);
    }
    
    // Create table
    await this.databaseAdapter.createTable(tableName, columns);
  }
  
  /**
   * Build RLS (Row Level Security) conditions
   * @param entityConfig Entity configuration
   * @param context User context
   * @private
   */
  private buildRLSConditions(entityConfig: EntityConfiguration, context: Context): { sql: string; params: any[] } {
    // Get user roles from context
    const userRoles = context.user?.roles || [];
    
    // If no roles or no RLS rules, return empty conditions
    if (userRoles.length === 0 || entityConfig.rls.length === 0) {
      return { sql: '', params: [] };
    }
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    // Process each RLS rule
    for (const rule of entityConfig.rls) {
      // Skip inactive rules
      if (!rule.is_active) {
        continue;
      }
      
      // Skip rules for roles not in user context
      if (!userRoles.includes(rule.role)) {
        continue;
      }
      
      // Process rule conditions
      const ruleConditions: string[] = [];
      
      for (const condition of rule.rls_config.conditions) {
        let operator: string;
        
        // Map operator
        switch (condition.op) {
          case 'eq':
            operator = '=';
            break;
          case 'neq':
            operator = '!=';
            break;
          case 'gt':
            operator = '>';
            break;
          case 'gte':
            operator = '>=';
            break;
          case 'lt':
            operator = '<';
            break;
          case 'lte':
            operator = '<=';
            break;
          case 'in':
            operator = 'IN';
            break;
          case 'nin':
            operator = 'NOT IN';
            break;
          case 'like':
            operator = 'LIKE';
            break;
          default:
            operator = '=';
        }
        
        // Handle special value cases
        let value = condition.value;
        
        // Handle context variables
        if (typeof value === 'string' && value.startsWith('$context.')) {
          const path = value.substring(9).split('.');
          let contextValue: any = context;
          
          for (const key of path) {
            if (contextValue === undefined || contextValue === null) {
              break;
            }
            contextValue = contextValue[key];
          }
          
          value = contextValue;
        }
        
        // Build condition SQL
        if (operator === 'IN' || operator === 'NOT IN') {
          if (Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(', ');
            ruleConditions.push(`${condition.field} ${operator} (${placeholders})`);
            params.push(...value);
          } else {
            ruleConditions.push(`${condition.field} ${operator} (?)`);
            params.push(value);
          }
        } else {
          ruleConditions.push(`${condition.field} ${operator} ?`);
          params.push(value);
        }
      }
      
      // Combine rule conditions
      if (ruleConditions.length > 0) {
        const relationOperator = rule.rls_config.relationbetweenconditions === 'or' ? ' OR ' : ' AND ';
        conditions.push(`(${ruleConditions.join(relationOperator)})`);
      }
    }
    
    // Combine all rule conditions with OR (any matching rule grants access)
    if (conditions.length > 0) {
      return {
        sql: conditions.join(' OR '),
        params
      };
    }
    
    return { sql: '', params: [] };
  }
  
  /**
   * Execute workflows for an entity
   * @param entityConfig Entity configuration
   * @param event Trigger event
   * @param oldData Old data (for update/delete)
   * @param newData New data (for create/update)
   * @param context User context
   * @private
   */
  private async executeWorkflows(
    entityConfig: EntityConfiguration,
    event: 'create' | 'update' | 'delete' | 'field_change',
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
    context: Context
  ): Promise<void> {
    // Get workflows for this event
    const workflows = entityConfig.workflows.filter(w => w.trigger_event === event && w.is_active);
    
    // Execute each workflow
    for (const workflow of workflows) {
      try {
        // Check conditions
        if (workflow.conditions) {
          // In a real implementation, we would evaluate conditions here
          // This is a placeholder for condition evaluation
        }
        
        // Execute actions
        for (const action of workflow.actions) {
          // In a real implementation, we would execute actions based on type
          // This is a placeholder for action execution
          console.log(`Executing workflow action: ${action.type}`);
        }
      } catch (error) {
        console.error(`Error executing workflow ${workflow.name}: ${error}`);
      }
    }
  }

  /**
   * Find entity instances by view
   * @param entityName Entity name
   * @param viewName View name
   * @param params Query parameters
   * @param context User context
   */
  async findByView(
    entityName: string,
    viewName: string,
    params: Record<string, any> = {},
    context: Context = {}
  ): Promise<QueryResult> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Find the requested view
      const view = entityConfig.views.find(v => v.name === viewName);
      if (!view) {
        throw new SchemaKitError(`View '${viewName}' not found for entity '${entityName}'`);
      }
      
      // Ensure entity table exists
      await this.ensureEntityTable(entityConfig);
      
      // Apply RLS (Row Level Security) conditions
      const rlsConditions = this.buildRLSConditions(entityConfig, context);
      
      // Build query from view configuration
      const queryConfig = view.query_config;
      
      // Start building the SQL query
      let sql = `SELECT ${Array.isArray(view.fields) ? view.fields.join(', ') : '*'} FROM ${entityConfig.entity.table_name}`;
      
      // Add joins if specified
      if (queryConfig.joins && queryConfig.joins.length > 0) {
        for (const join of queryConfig.joins) {
          const joinType = join.type || 'inner';
          sql += ` ${joinType.toUpperCase()} JOIN ${join.entity} ${join.alias ? 'AS ' + join.alias : ''} ON ${join.on}`;
        }
      }
      
      // Add where conditions
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      
      // Add filters from view config
      if (queryConfig.filters) {
        for (const [field, filter] of Object.entries(queryConfig.filters)) {
          if (typeof filter === 'object') {
            // Handle complex filters (e.g., range, in, etc.)
            if ('eq' in filter) {
              whereConditions.push(`${field} = ?`);
              queryParams.push(filter.eq);
            } else if ('neq' in filter) {
              whereConditions.push(`${field} != ?`);
              queryParams.push(filter.neq);
            } else if ('gt' in filter) {
              whereConditions.push(`${field} > ?`);
              queryParams.push(filter.gt);
            } else if ('gte' in filter) {
              whereConditions.push(`${field} >= ?`);
              queryParams.push(filter.gte);
            } else if ('lt' in filter) {
              whereConditions.push(`${field} < ?`);
              queryParams.push(filter.lt);
            } else if ('lte' in filter) {
              whereConditions.push(`${field} <= ?`);
              queryParams.push(filter.lte);
            } else if ('in' in filter && Array.isArray(filter.in)) {
              const placeholders = filter.in.map(() => '?').join(', ');
              whereConditions.push(`${field} IN (${placeholders})`);
              queryParams.push(...filter.in);
            } else if ('like' in filter) {
              whereConditions.push(`${field} LIKE ?`);
              queryParams.push(filter.like);
            }
          } else {
            // Handle simple equality filter
            whereConditions.push(`${field} = ?`);
            queryParams.push(filter);
          }
        }
      }
      
      // Add filters from params
      for (const [key, value] of Object.entries(params)) {
        // Skip pagination and sorting params
        if (['page', 'per_page', 'sort_by', 'sort_dir'].includes(key)) {
          continue;
        }
        
        if (typeof value === 'object' && value !== null) {
          // Handle complex filters from params
          if ('eq' in value) {
            whereConditions.push(`${key} = ?`);
            queryParams.push(value.eq);
          } else if ('neq' in value) {
            whereConditions.push(`${key} != ?`);
            queryParams.push(value.neq);
          } else if ('gt' in value) {
            whereConditions.push(`${key} > ?`);
            queryParams.push(value.gt);
          } else if ('gte' in value) {
            whereConditions.push(`${key} >= ?`);
            queryParams.push(value.gte);
          } else if ('lt' in value) {
            whereConditions.push(`${key} < ?`);
            queryParams.push(value.lt);
          } else if ('lte' in value) {
            whereConditions.push(`${key} <= ?`);
            queryParams.push(value.lte);
          } else if ('in' in value && Array.isArray(value.in)) {
            const placeholders = value.in.map(() => '?').join(', ');
            whereConditions.push(`${key} IN (${placeholders})`);
            queryParams.push(...value.in);
          } else if ('like' in value) {
            whereConditions.push(`${key} LIKE ?`);
            queryParams.push(value.like);
          }
        } else {
          // Handle simple equality filter
          whereConditions.push(`${key} = ?`);
          queryParams.push(value);
        }
      }
      
      // Add RLS conditions if any
      if (rlsConditions.sql) {
        whereConditions.push(`(${rlsConditions.sql})`);
        queryParams.push(...rlsConditions.params);
      }
      
      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add sorting
      const sortBy = params.sort_by || (queryConfig.sorting && queryConfig.sorting[0]?.field);
      const sortDir = params.sort_dir || (queryConfig.sorting && queryConfig.sorting[0]?.direction) || 'asc';
      
      if (sortBy) {
        sql += ` ORDER BY ${sortBy} ${sortDir.toUpperCase()}`;
      }
      
      // Add pagination
      const page = Number(params.page) || 1;
      const perPage = Number(params.per_page) || 
                     (queryConfig.pagination && queryConfig.pagination.default_limit) || 
                     10;
      
      // Get total count first
      const countSql = `SELECT COUNT(*) as total FROM ${entityConfig.entity.table_name}`;
      const countWhere = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
      const countResult = await this.databaseAdapter.query(countSql + countWhere, queryParams);
      const total = countResult[0]?.total || 0;
      
      // Add LIMIT and OFFSET
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(perPage, (page - 1) * perPage);
      
      // Execute query
      const results = await this.databaseAdapter.query(sql, queryParams);
      
      // Process results
      const processedResults = results.map(result => this.processEntityResult(entityConfig, result));
      
      // Check permissions for actions
      const permissions = await this.getEntityPermissions(entityName, context);
      
      return {
        data: processedResults,
        meta: {
          total,
          page,
          per_page: perPage,
          has_more: total > page * perPage
        },
        permissions: {
          can_create: permissions.create || false,
          can_update: permissions.update || false,
          can_delete: permissions.delete || false
        }
      };
    } catch (error) {
      throw new SchemaKitError(`Failed to execute view '${viewName}' for entity '${entityName}': ${error}`);
    }
  }

  /**
   * Update entity instance
   * @param entityName Entity name
   * @param id Entity ID
   * @param data Entity data
   * @param context User context
   */
  async update(
    entityName: string,
    id: string | number,
    data: Record<string, any>,
    context: Context = {}
  ): Promise<Record<string, any>> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'update', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for updating ${entityName}`);
      }
      
      // Get current entity data
      const currentData = await this.findById(entityName, id, context);
      if (!currentData) {
        throw new SchemaKitError(`Entity ${entityName} with id ${id} not found`);
      }
      
      // Validate data against entity schema
      const validationResult = this.validateEntityData(entityConfig, data, 'update');
      if (!validationResult.isValid) {
        throw new SchemaKitError(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
      }
      
      // Prepare data for update
      const updateData = this.prepareDataForUpdate(entityConfig, data);
      
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      // Execute pre-update workflows
      await this.executeWorkflows(entityConfig, 'update', currentData, updateData, context);
      
      // Check if there are fields to update
      if (Object.keys(updateData).length === 0) {
        return currentData; // Nothing to update
      }
      
      // Build update query
      const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(id); // Add ID for WHERE clause
      
      const sql = `UPDATE ${entityConfig.entity.table_name} SET ${setClause} WHERE id = ?`;
      
      // Execute update
      await this.databaseAdapter.execute(sql, values);
      
      // Get updated entity
      const updatedData = await this.findById(entityName, id, context);
      if (!updatedData) {
        throw new SchemaKitError(`Failed to retrieve updated entity ${entityName} with id ${id}`);
      }
      
      // Execute post-update workflows
      await this.executeWorkflows(entityConfig, 'update', currentData, updatedData, context);
      
      return updatedData;
    } catch (error) {
      throw new SchemaKitError(`Failed to update ${entityName} with id ${id}: ${error}`);
    }
  }

  /**
   * Delete entity instance
   * @param entityName Entity name
   * @param id Entity ID
   * @param context User context
   */
  async delete(entityName: string, id: string | number, context: Context = {}): Promise<boolean> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'delete', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for deleting ${entityName}`);
      }
      
      // Get current entity data
      const currentData = await this.findById(entityName, id, context);
      if (!currentData) {
        throw new SchemaKitError(`Entity ${entityName} with id ${id} not found`);
      }
      
      // Execute pre-delete workflows
      await this.executeWorkflows(entityConfig, 'delete', currentData, null, context);
      
      // Execute delete
      const sql = `DELETE FROM ${entityConfig.entity.table_name} WHERE id = ?`;
      const result = await this.databaseAdapter.execute(sql, [id]);
      
      // Execute post-delete workflows
      await this.executeWorkflows(entityConfig, 'delete', currentData, null, context);
      
      return result.changes > 0;
    } catch (error) {
      throw new SchemaKitError(`Failed to delete ${entityName} with id ${id}: ${error}`);
    }
  }
  
  /**
   * Prepare data for update
   * @param entityConfig Entity configuration
   * @param data Data to prepare
   * @private
   */
  private prepareDataForUpdate(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Process each field
    for (const field of entityConfig.fields) {
      // Skip fields that are not in the update data
      if (!data.hasOwnProperty(field.name)) {
        continue;
      }
      
      let value = data[field.name];
      
      // Skip undefined values
      if (value === undefined) {
        continue;
      }
      
      // Convert values based on field type
      switch (field.type) {
        case 'date':
          if (value instanceof Date) {
            value = value.toISOString();
          }
          break;
          
        case 'json':
        case 'array':
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          break;
      }
      
      result[field.name] = value;
    }
    
    return result;
  }

  /**
   * Execute custom query
   * @param entityName Entity name
   * @param queryBuilder Query builder function
   * @param context User context
   */
  async query(
    entityName: string,
    queryBuilder: (query: any) => any,
    context: Context = {}
  ): Promise<QueryResult> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.checkPermission(entityName, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Ensure entity table exists
      await this.ensureEntityTable(entityConfig);
      
      // Define the query builder interface
      interface QueryBuilder {
        table: string;
        selectFields: string;
        whereConditions: { field: string; op: string; value: any }[];
        orderByFields: { field: string; direction: 'asc' | 'desc' }[];
        limitValue: number;
        offsetValue: number;
        
        select(fields: string | string[]): QueryBuilder;
        addWhere(field: string, op: string, value: any): QueryBuilder;
        addOrderBy(field: string, direction?: 'asc' | 'desc'): QueryBuilder;
        setLimit(limit: number): QueryBuilder;
        setOffset(offset: number): QueryBuilder;
      }
      
      // Create a query builder object
      const queryObj: QueryBuilder = {
        table: entityConfig.entity.table_name,
        selectFields: '*',
        whereConditions: [],
        orderByFields: [],
        limitValue: 10,
        offsetValue: 0,
        
        // Methods for building the query
        select(fields: string | string[]): QueryBuilder {
          this.selectFields = Array.isArray(fields) ? fields.join(', ') : fields;
          return this;
        },
        
        addWhere(field: string, op: string, value: any): QueryBuilder {
          this.whereConditions.push({ field, op, value });
          return this;
        },
        
        addOrderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
          this.orderByFields.push({ field, direction });
          return this;
        },
        
        setLimit(limit: number): QueryBuilder {
          this.limitValue = limit;
          return this;
        },
        
        setOffset(offset: number): QueryBuilder {
          this.offsetValue = offset;
          return this;
        }
      };
      
      // Let the caller build the query
      const builtQuery = queryBuilder(queryObj);
      
      // Apply RLS (Row Level Security) conditions
      const rlsConditions = this.buildRLSConditions(entityConfig, context);
      
      // Build SQL query
      let sql = `SELECT ${builtQuery.selectFields} FROM ${builtQuery.table}`;
      const params: any[] = [];
      
      // Add WHERE conditions
      const whereConditions: string[] = [];
      
      for (const condition of builtQuery.whereConditions) {
        whereConditions.push(`${condition.field} ${condition.op} ?`);
        params.push(condition.value);
      }
      
      // Add RLS conditions if any
      if (rlsConditions.sql) {
        whereConditions.push(`(${rlsConditions.sql})`);
        params.push(...rlsConditions.params);
      }
      
      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add ORDER BY clause
      if (builtQuery.orderByFields.length > 0) {
        const orderClauses = builtQuery.orderByFields.map(
          (order: { field: string; direction: 'asc' | 'desc' }) => 
            `${order.field} ${order.direction.toUpperCase()}`
        );
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
      
      // Add LIMIT and OFFSET
      sql += ` LIMIT ? OFFSET ?`;
      params.push(builtQuery.limitValue, builtQuery.offsetValue);
      
      // Get total count first (for pagination)
      const countSql = `SELECT COUNT(*) as total FROM ${builtQuery.table}`;
      const countWhere = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
      const countParams = params.slice(0, params.length - 2); // Remove limit and offset
      const countResult = await this.databaseAdapter.query(countSql + countWhere, countParams);
      const total = countResult[0]?.total || 0;
      
      // Execute query
      const results = await this.databaseAdapter.query(sql, params);
      
      // Process results
      const processedResults = results.map(result => this.processEntityResult(entityConfig, result));
      
      // Check permissions for actions
      const permissions = await this.getEntityPermissions(entityName, context);
      
      return {
        data: processedResults,
        meta: {
          total,
          page: Math.floor(builtQuery.offset / builtQuery.limit) + 1,
          per_page: builtQuery.limit,
          has_more: total > builtQuery.offset + builtQuery.limit
        },
        permissions: {
          can_create: permissions.create || false,
          can_update: permissions.update || false,
          can_delete: permissions.delete || false
        }
      };
    } catch (error) {
      throw new SchemaKitError(`Failed to execute custom query for entity '${entityName}': ${error}`);
    }
  }

  /**
   * Execute view query
   * @param entityName Entity name
   * @param viewName View name
   * @param params Query parameters
   * @param context User context
   */
  async executeView(
    entityName: string,
    viewName: string,
    params: Record<string, any> = {},
    context: Context = {}
  ): Promise<QueryResult> {
    // This is essentially the same as findByView but with a different name for API consistency
    return this.findByView(entityName, viewName, params, context);
  }

  /**
   * Check if user has permission for action
   * @param entityName Entity name
   * @param action Action name
   * @param context User context
   */
  async checkPermission(entityName: string, action: string, context: Context = {}): Promise<boolean> {
    try {
      // For simplicity in this implementation, we'll allow all operations
      // In a real implementation, we would check permissions based on roles and conditions
      
      // Get user roles from context
      const userRoles = context.user?.roles || [];
      
      // If no roles specified and no context user, use default permissions
      if (userRoles.length === 0 && !context.user) {
        // Default permissions: allow all operations
        return true;
      }
      
      // Load entity configuration (without using loadEntity to avoid circular dependency)
      const entityConfig = this.entityCache.get(entityName);
      
      if (!entityConfig) {
        // If entity is not loaded, we need to load permissions directly
        const entityDef = await this.loadEntityDefinition(entityName);
        if (!entityDef) {
          return false; // Entity doesn't exist
        }
        
        const permissions = await this.loadEntityPermissions(entityDef.id, context);
        
        // Check if any permission allows the action
        return permissions.some(p => 
          p.action === action && 
          p.is_allowed && 
          userRoles.includes(p.role)
        );
      }
      
      // Check if any permission allows the action
      return entityConfig.permissions.some(p => 
        p.action === action && 
        p.is_allowed && 
        userRoles.includes(p.role)
      );
    } catch (error) {
      // If there's an error checking permissions, default to denying access
      console.error(`Error checking permission: ${error}`);
      return false;
    }
  }

  /**
   * Get entity permissions for user
   * @param entityName Entity name
   * @param context User context
   */
  async getEntityPermissions(entityName: string, context: Context = {}): Promise<Record<string, boolean>> {
    try {
      // Default permissions
      const permissions: Record<string, boolean> = {
        create: false,
        read: false,
        update: false,
        delete: false,
        list: false
      };
      
      // For simplicity in this implementation, we'll check each permission individually
      permissions.create = await this.checkPermission(entityName, 'create', context);
      permissions.read = await this.checkPermission(entityName, 'read', context);
      permissions.update = await this.checkPermission(entityName, 'update', context);
      permissions.delete = await this.checkPermission(entityName, 'delete', context);
      permissions.list = await this.checkPermission(entityName, 'list', context);
      
      return permissions;
    } catch (error) {
      // If there's an error checking permissions, default to denying all access
      console.error(`Error getting entity permissions: ${error}`);
      return {
        create: false,
        read: false,
        update: false,
        delete: false,
        list: false
      };
    }
  }
}