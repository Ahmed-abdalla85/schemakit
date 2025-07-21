/**
 * Entity - Unified Entity Management
 * 
 * A streamlined entity class that loads configuration once during initialization
 * and provides synchronous access to fields, permissions, and CRUD operations.
 */
import { DatabaseManager } from '../../database/database-manager';
import { FluentQueryBuilder } from '../../database/fluent-query-builder';
import { EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, ViewDefinition, WorkflowDefinition, RLSDefinition, Context } from '../../types';
import { ValidationManager } from '../validation/validation-manager';
import { PermissionManager } from '../permission/permission-manager';
import { WorkflowManager } from '../workflow/workflow-manager';
import { SchemaKitError } from '../../errors';
import { generateId } from '../../utils/id-generation';
import { getCurrentTimestamp } from '../../utils/date-helpers';
import { safeJsonParse } from '../../utils/json-helpers';

export class Entity {
  private readonly entityName: string;
  private readonly tenantId: string;
  private readonly databaseManager: DatabaseManager;
  
  // Preloaded configuration - available synchronously after initialization
  private config: EntityConfiguration | null = null;
  
  // Managers for business logic
  private validationManager: ValidationManager;
  private permissionManager: PermissionManager;
  private workflowManager: WorkflowManager;

  constructor(
    entityName: string,
    databaseManager: DatabaseManager,
    tenantId = 'default'
  ) {
    this.entityName = entityName;
    this.tenantId = tenantId;
    this.databaseManager = databaseManager;
    
    // Initialize managers
    const databaseAdapter = databaseManager.getAdapter();
    this.validationManager = new ValidationManager();
    this.permissionManager = new PermissionManager(databaseAdapter);
    this.workflowManager = new WorkflowManager(databaseAdapter);
  }

  /**
   * Initialize the entity by loading its configuration
   * Must be called before using the entity
   */
  async initialize(context: Context = {}): Promise<void> {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    this.config = await this.loadEntityConfiguration(contextWithTenant);
    
    // Ensure entity table exists
    await this.ensureEntityTable();
  }

  /**
   * Check if entity is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  // === SYNCHRONOUS CONFIGURATION ACCESS ===

  /**
   * Get entity fields (synchronous after initialization)
   */
  get fields(): FieldDefinition[] {
    this.ensureInitialized();
    return this.config!.fields;
  }

  /**
   * Get entity definition (synchronous after initialization)
   */
  get definition(): EntityDefinition {
    this.ensureInitialized();
    return this.config!.entity;
  }

  /**
   * Get entity permissions (synchronous after initialization)
   */
  get permissions(): PermissionDefinition[] {
    this.ensureInitialized();
    return this.config!.permissions;
  }

  /**
   * Get entity views (synchronous after initialization)
   */
  get views(): ViewDefinition[] {
    this.ensureInitialized();
    return this.config!.views;
  }

  /**
   * Get entity workflows (synchronous after initialization)
   */
  get workflows(): WorkflowDefinition[] {
    this.ensureInitialized();
    return this.config!.workflows;
  }

  /**
   * Get RLS rules (synchronous after initialization)
   */
  get rls(): RLSDefinition[] {
    this.ensureInitialized();
    return this.config!.rls;
  }

  /**
   * Get JSON schema (synchronous after initialization)
   */
  get schema(): object {
    this.ensureInitialized();
    return this.generateJsonSchema();
  }

  /**
   * Get table name (synchronous after initialization)
   */
  get tableName(): string {
    this.ensureInitialized();
    return this.config!.entity.table_name;
  }

  // === CRUD OPERATIONS ===

  /**
   * Create a new record
   */
  async create(data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.enforcePermission('create', contextWithTenant);
    await this.validateData(data, 'create');

    const result = await this.insertData(data, contextWithTenant);
    await this.executeWorkflows('create', null, result, contextWithTenant);

    return result;
  }

  /**
   * Read records with optional filters
   */
  async read(filters: Record<string, any> = {}, options: {
    fields?: string[];
    sort?: { field: string; direction: 'ASC' | 'DESC' }[];
    limit?: number;
    offset?: number;
  } = {}, context: Context = {}): Promise<Record<string, any>[]> {
    this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.enforcePermission('read', contextWithTenant);

    // Convert filters object to conditions array
    const conditions = Object.entries(filters).map(([field, value]) => ({
      field,
      value,
      operator: 'eq'
    }));

    return this.findData(conditions, options, contextWithTenant);
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.enforcePermission('update', contextWithTenant);
    await this.validateData(data, 'update');

    const oldData = await this.findById(id, contextWithTenant);
    const result = await this.updateData(id, data, contextWithTenant);
    await this.executeWorkflows('update', oldData, result, contextWithTenant);

    return result;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number, context: Context = {}): Promise<boolean> {
    this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.enforcePermission('delete', contextWithTenant);

    const oldData = await this.findById(id, contextWithTenant);
    const result = await this.deleteData(id, contextWithTenant);
    await this.executeWorkflows('delete', oldData, null, contextWithTenant);

    return result;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.enforcePermission('read', contextWithTenant);
    return this.findByIdData(id, contextWithTenant);
  }

  /**
   * Reload entity configuration
   */
  async reload(context: Context = {}): Promise<void> {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    this.config = await this.loadEntityConfiguration(contextWithTenant);
  }

  // === DATABASE ACCESS ===

  /**
   * Get fluent query builder for this entity's table
   */
  db(): FluentQueryBuilder {
    this.ensureInitialized();
    return this.databaseManager.db(this.tableName, this.tenantId);
  }

  /**
   * Get database manager
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }

  // === PRIVATE METHODS ===

  private ensureInitialized(): void {
    if (!this.config) {
      throw new SchemaKitError(`Entity '${this.entityName}' must be initialized before use. Call entity.initialize() first.`);
    }
  }

  private async loadEntityConfiguration(context: Context): Promise<EntityConfiguration> {
    try {
      // Load entity definition
      const entity = await this.loadEntityDefinition();
      if (!entity) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      // Load all configuration components in parallel
      const [fields, permissions, views, workflows, rls] = await Promise.all([
        this.loadEntityFields(entity.id),
        this.loadEntityPermissions(entity.id, context),
        this.loadEntityViews(entity.id),
        this.loadEntityWorkflows(entity.id),
        this.loadEntityRLS(entity.id, context)
      ]);

      return {
        entity,
        fields,
        permissions,
        views,
        workflows,
        rls
      };
    } catch (error) {
      throw new SchemaKitError(`Failed to load entity '${this.entityName}' for tenant '${this.tenantId}': ${error instanceof Error ? error.message : error}`);
    }
  }

  private async loadEntityDefinition(): Promise<EntityDefinition | null> {
    const entities = await this.databaseManager.query<EntityDefinition>(
      'SELECT * FROM system_entities WHERE name = ? AND is_active = ?',
      [this.entityName, 1]
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

  private async enforcePermission(action: string, context: Context): Promise<void> {
    const allowed = await this.permissionManager.checkPermission(this.config!, action, context);
    if (!allowed) {
      throw new SchemaKitError(`Permission denied: ${action} on ${this.entityName}`);
    }
  }

  private async validateData(data: Record<string, any>, action: 'create' | 'update'): Promise<void> {
    const validation = await this.validationManager.validate(this.config!, data, action);
    if (!validation.isValid) {
      throw new SchemaKitError(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }
  }

  private async executeWorkflows(event: string, oldData: any, newData: any, context: Context): Promise<void> {
    await this.workflowManager.executeWorkflows(this.config!, event, oldData, newData, context);
  }

  private generateJsonSchema(): object {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of this.fields) {
      properties[field.name] = {
        type: this.mapFieldTypeToJsonSchema(field.type),
        description: field.description,
      };

      if (field.is_required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private mapFieldTypeToJsonSchema(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      boolean: 'boolean',
      date: 'string',
      datetime: 'string',
      json: 'object',
      object: 'object',
      array: 'array',
      reference: 'string',
    };
    return typeMap[type] || 'string';
  }

  // === DATA OPERATIONS ===

  private async insertData(data: Record<string, any>, context: Context): Promise<Record<string, any>> {
    await this.ensureEntityTable();

    // Generate ID if not provided
    if (!data.id) {
      data.id = generateId();
    }

    // Add system fields
    const timestamp = getCurrentTimestamp();
    data.created_at = timestamp;
    data.updated_at = timestamp;

    if (context.user?.id) {
      data.created_by = context.user.id;
      data.updated_by = context.user.id;
    }

    const result = await this.db().insert(data);

    if (result.changes === 0) {
      throw new Error(`Failed to create ${this.tableName} record`);
    }

    const insertedId = result.lastInsertId;
    if (insertedId) {
      const insertedRecord = await this.findByIdData(insertedId, context);
      return insertedRecord || { id: insertedId, ...data };
    }

    return { id: generateId(), ...data };
  }

  private async findByIdData(id: string | number, context: Context): Promise<Record<string, any> | null> {
    let query = this.db().where('id', id);
    
    // Add RLS conditions if applicable
    const rlsConditions = this.buildRLSConditions(context);
    if (rlsConditions) {
      for (const condition of rlsConditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    return await query.first();
  }

  private async updateData(id: string | number, data: Record<string, any>, context: Context): Promise<Record<string, any>> {
    // Add system fields
    data.updated_at = getCurrentTimestamp();
    
    if (context.user?.id) {
      data.updated_by = context.user.id;
    }

    // Remove ID from update data if present
    if ('id' in data) {
      delete data.id;
    }

    let query = this.db().where('id', id);
    
    // Add RLS conditions if applicable
    const rlsConditions = this.buildRLSConditions(context);
    if (rlsConditions) {
      for (const condition of rlsConditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    const result = await query.update(data);
    if (result.changes === 0) {
      throw new Error(`Record not found or permission denied: ${this.tableName} with ID ${id}`);
    }

    return await this.findByIdData(id, context) || { id, ...data };
  }

  private async deleteData(id: string | number, context: Context): Promise<boolean> {
    let query = this.db().where('id', id);
    
    // Add RLS conditions if applicable
    const rlsConditions = this.buildRLSConditions(context);
    if (rlsConditions) {
      for (const condition of rlsConditions) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    const result = await query.delete();
    return result.changes > 0;
  }

  private async findData(
    conditions: any[] = [],
    options: {
      fields?: string[];
      sort?: { field: string; direction: 'ASC' | 'DESC' }[];
      limit?: number;
      offset?: number;
    } = {},
    context: Context
  ): Promise<Record<string, any>[]> {
    let query = this.db();

    // Add RLS conditions first
    const rlsConditions = this.buildRLSConditions(context);
    if (rlsConditions) {
      for (const condition of rlsConditions) {
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

  private buildRLSConditions(context: Context): any[] | null {
    if (!this.rls || this.rls.length === 0) {
      return null;
    }

    const conditions: any[] = [];
    for (const rule of this.rls) {
      if (rule.rls_config && rule.rls_config.conditions) {
        conditions.push(...rule.rls_config.conditions);
      }
    }

    return conditions.length > 0 ? conditions : null;
  }

  private async ensureEntityTable(): Promise<void> {
    const exists = await this.databaseManager.tableExists(this.tableName);
    
    if (!exists) {
      // Build column definitions
      const columns = this.fields.map((field: any) => ({
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

      await this.databaseManager.createTable(this.tableName, columns);
    }
  }

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