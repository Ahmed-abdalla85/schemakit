import { DB } from '../../database/db';
import { 
  EntityDefinition, FieldDefinition, Context 
} from '../../types/core';
import { PermissionDefinition, RLSDefinition } from '../../types/permissions';
import { ViewDefinition } from '../../types/views';
import { WorkflowDefinition } from '../../types/workflows';
import { SchemaKitError } from '../../errors';
import { generateId } from '../../utils/id-generation';
import { getCurrentTimestamp } from '../../utils/date-helpers';
import { safeJsonParse } from '../../utils/json-helpers';
import { ViewManager } from '../views/view-manager';
import { ViewOptions, ViewResult } from '../../types/views';
import type { ValidationAdapter, CompiledSchema, UnknownFieldPolicy } from '../../validation/adapter';


export class Entity {
  private static cache = new Map<string, Entity>();
  
  private readonly entityName: string;
  private readonly tenantId: string;
  private readonly db: DB;
  private initialized = false;
  
  // Validation adapter and compiled schema managed at the Entity level
  private validationAdapter: ValidationAdapter | null = null;
  private compiledSchema: CompiledSchema | null = null;
  private unknownFieldPolicy: UnknownFieldPolicy = 'strip';
  
  public fields: FieldDefinition[] = [];
  public permissions: PermissionDefinition[] = [];
  public workflow: WorkflowDefinition[] = [];
  public rls: RLSDefinition[] = [];
  public views: ViewDefinition[] = [];
  private entityDefinition: EntityDefinition | null = null;
  private tableName: string = '';
  public viewManager: ViewManager | null = null;
  static create(entityName: string, tenantId: string, db: DB): Entity {
    const cacheKey = `${tenantId}:${entityName}`;
    if (Entity.cache.has(cacheKey)) return Entity.cache.get(cacheKey)!;
    const entity = new Entity(entityName, tenantId, db);
    Entity.cache.set(cacheKey, entity);
    return entity;
  }

  /**
   * Determine the primary key field name for this entity's table
   */
  private getPrimaryKeyFieldName(): string {
    return `${this.tableName}_id`;
  }

  private constructor(entityName: string, tenantId: string, db: DB) {
    this.entityName = entityName;
    this.tenantId = tenantId;
    this.db = db;
  }

  get isInitialized(): boolean { return this.initialized; }
  get name(): string { return this.entityName; }
  get tenant(): string { return this.tenantId; }
  
  /**
   * Configure validation for this entity instance. Safe to call multiple times; will rebuild schema on next initialize.
   */
  setValidation(adapter: ValidationAdapter, unknownFieldPolicy?: UnknownFieldPolicy): void {
    this.validationAdapter = adapter;
    if (unknownFieldPolicy) this.unknownFieldPolicy = unknownFieldPolicy;
    // Invalidate compiled schema so it can be rebuilt with new config
    if (this.initialized) {
      // Rebuild immediately if we already have fields loaded
      const entityId = this.entityDefinition?.entity_id || `${this.tenantId}:${this.entityName}`;
      this.compiledSchema = this.validationAdapter.buildSchema(entityId, this.fields, {
        unknownFieldPolicy: this.unknownFieldPolicy
      });
    } else {
      this.compiledSchema = null;
    }
  }
  
  async initialize(context: Context = {}): Promise<void> {
    if (this.initialized) return;

    const contextWithTenant = { ...context, tenantId: this.tenantId };
   
    try {
      // Load entity definition first
      this.entityDefinition = await this.loadEntityDefinition();
      if (!this.entityDefinition) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      // Load metadata in parallel, DB query builder is concurrency-safe
      const [fields, permissions, workflows, views, rls] = await Promise.all([
        this.loadFields(this.entityDefinition.entity_id),
        this.loadPermissions(this.entityDefinition.entity_id, contextWithTenant),
        this.loadWorkflows(this.entityDefinition.entity_id),
        this.loadViews(this.entityDefinition.entity_id),
        this.loadRLS(this.entityDefinition.entity_id)
      ]);
      this.fields = fields;
      this.permissions = permissions;
      this.workflow = workflows;
      this.rls = rls;
      this.views = views;
      this.tableName = this.entityDefinition.entity_table_name || this.entityName;
      await this.ensureTable();
      // Build validation schema if adapter is configured
      if (this.validationAdapter) {
        const entityId = this.entityDefinition.entity_id || `${this.tenantId}:${this.entityName}`;
        this.compiledSchema = this.validationAdapter.buildSchema(entityId, this.fields, {
          unknownFieldPolicy: this.unknownFieldPolicy
        });
      }
      
      // Initialize ViewManager with loaded metadata
      this.viewManager = new ViewManager(
        this.db,
        this.entityName,
        this.tableName,
        this.fields,
        this.views
      );

      // TODO: Set up RLS restrictions if available
      // this.setupRLSRestrictions();
      
      this.initialized = true;
    } catch (error) {
      throw new SchemaKitError(
        `Failed to initialize entity '${this.entityName}': ${error instanceof Error ? error.message : String(error)}`,
        { 
          code: 'ENTITY_INITIALIZATION_FAILED',
          cause: error 
        }
      );
    }
  }

  /**
   * Execute a view by name
   */
  async view(viewName: string, options: ViewOptions = {}, context: Context = {}): Promise<ViewResult> {
    await this.ensureInitialized();
    if (!this.viewManager) {
      throw new SchemaKitError('ViewManager not initialized');
    }
    return this.viewManager.executeView(viewName, context, options);
  }



  /**
   * Read records with optional filters
   */
  async get(filters: Record<string, any> = {}, context: Context = {}): Promise<Record<string, any>[]> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('read', contextWithTenant);

    let query = this.db.select('*').from(this.tableName);

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      query = query.where({ [field]: value });
    }

    // Apply RLS conditions using equality fallbacks for now
    const rlsConditions = this.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.resolveRLSValue(condition.value, contextWithTenant) });
    }

    return await query.get();
  }


  /**
   * Find a record by ID
   */
  async getById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('read', contextWithTenant);

    const idField = this.getPrimaryKeyFieldName();
    let query = this.db.select('*').from(this.tableName).where({ [idField]: id });

    // Apply RLS conditions using equality fallbacks for now
    const rlsConditions = this.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.resolveRLSValue(condition.value, contextWithTenant) });
    }

    const results = await query.get();
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new record
   */
  async insert(data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('create', contextWithTenant);
    
    // Adapter-based validation/sanitization first (if configured). Skip internal validateData when adapter is present
    if (this.validationAdapter && this.compiledSchema) {
      const res = this.validationAdapter.validate('create', this.compiledSchema, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: res.errors });
      }
      data = res.data as Record<string, any>;
    } else {
      this.validateData(data, 'create');
    }

    // Add system fields and ensure both generic 'id' and '{table}_id' are set
    const pkField = this.getPrimaryKeyFieldName();
    const generatedId = data.id || (data as any)[pkField] || generateId();
    const enrichedData: Record<string, any> = {
      ...data,
      id: generatedId,
      [pkField]: generatedId,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
      ...(contextWithTenant.user?.id && {
        created_by: contextWithTenant.user.id,
        updated_by: contextWithTenant.user.id
      })
    };

    // Use DB insert
    await this.db.insert(this.tableName, enrichedData);

    await this.executeWorkflows('create', null, enrichedData, contextWithTenant);
    return enrichedData;
  }

  

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('update', contextWithTenant);
    
    // Adapter-based validation/sanitization first (if configured). Skip internal validateData when adapter is present
    if (this.validationAdapter && this.compiledSchema) {
      const res = this.validationAdapter.validate('update', this.compiledSchema, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: res.errors });
      }
      data = res.data as Record<string, any>;
    } else {
      this.validateData(data, 'update');
    }

    // Get old data for workflow
    const oldData = await this.getById(id, contextWithTenant);
    if (!oldData) {
      throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      ...data,
      updated_at: getCurrentTimestamp(),
      ...(contextWithTenant.user?.id && { updated_by: contextWithTenant.user.id })
    };
    // Do not allow changing primary key
    delete updateData.id;
    delete (updateData as any)[this.getPrimaryKeyFieldName()];

    // Use DB update (filter by id)
    const idField = this.getPrimaryKeyFieldName();
    await this.db.where({ [idField]: id }).update(this.tableName, updateData);

    const newData = { ...oldData, ...updateData };
    await this.executeWorkflows('update', oldData, newData, contextWithTenant);
    return newData;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number, context: Context = {}): Promise<boolean> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('delete', contextWithTenant);

    // Get old data for workflow
    const oldData = await this.getById(id, contextWithTenant);
    if (!oldData) {
      throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    }

    // Use DB delete (filter by id)
    const idField = this.getPrimaryKeyFieldName();
    await this.db.where({ [idField]: id }).delete(this.tableName);

    await this.executeWorkflows('delete', oldData, null, contextWithTenant);
    return true;
  }

  

  // === PRIVATE HELPER METHODS ===

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async loadEntityDefinition(): Promise<EntityDefinition | null> {
    const results = await this.db
      .select('*')
      .from('system_entities')
      .where({ entity_name: this.entityName })
      .get();

    // For compatibility, treat results as array (mock returns object)
    const entities = Array.isArray(results) ? results : [results];

    if (!entities.length || !entities[0]) return null;

    const entity = entities[0];
    if (entity.metadata && typeof entity.metadata === 'string') {
      entity.metadata = safeJsonParse(entity.metadata, {});
    }
    return entity;
  }

  private async loadFields(entityId: string): Promise<FieldDefinition[]> {
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
    }));
  }

  private async loadPermissions(entityId: string, context: Context): Promise<PermissionDefinition[]> {
    const userRoles = context.user?.roles || ['public'];
    let query = this.db.select('*')
                    .from('system_permissions')
                    .where({ permission_entity_id: entityId, permission_status: 'active' });
    const permissions = await query.get();

    return permissions.map((permission: any) => ({
      ...permission,
      conditions: permission.conditions && typeof permission.conditions === 'string'
        ? safeJsonParse(permission.conditions, {})
        : permission.conditions
    }));
  }

  private async loadWorkflows(entityId: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.db
      .select('*')
      .from('system_workflows')
      .where({ workflow_entity_id: entityId, workflow_status: 'active' })
      .orderBy('workflow_weight', 'ASC')
      .get();
    

    return workflows.map((workflow: any) => ({
      ...workflow,
      conditions: workflow.conditions && typeof workflow.conditions === 'string'
        ? safeJsonParse(workflow.conditions, {})
        : workflow.conditions,
      actions: workflow.actions && typeof workflow.actions === 'string'
        ? safeJsonParse(workflow.actions, [])
        : workflow.actions
    }));
  }

  private async loadRLS(entityId: string): Promise<RLSDefinition[]> {
    let query = this.db.select('*').from('system_rls').where({ rls_entity_id: entityId, rls_is_active: true });
    const rlsRules = await query.get();
    return rlsRules.map((rule: any) => ({
      ...rule,
      rls_config: rule.rls_config && typeof rule.rls_config === 'string'
        ? safeJsonParse(rule.rls_config, { relationbetweenconditions: 'and', conditions: [] })
        : rule.rls_config
    }));
  }

  private async loadViews(entityId: string): Promise<ViewDefinition[]> {
    const views = await this.db
      .select('*')
      .from('system_views')
      .where({ "view_entity_id": entityId })
      .get();

    return views.map((view: any) => {
      const normalized: ViewDefinition = {
        ...view,
        // Normalize JSON-like string fields to objects/arrays
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
      } as ViewDefinition;


      return normalized;
    });
  }

  private async checkPermission(action: string, context: Context): Promise<void> {
    const userRoles = context.user?.roles || ['public'];
    const hasPermission = this.permissions.some(p => 
            userRoles.includes(p.permission_role) &&
      p.permission_action === action &&
      p.permission_is_allowed
    );

    // if (!hasPermission) {
    //   throw new SchemaKitError(`Permission denied: ${action} on ${this.entityName}`);
    // }
  }

  private validateData(data: Record<string, any>, action: 'create' | 'update'): void {
    const errors: string[] = [];

    for (const field of this.fields) {
      const value = data[field.field_name];
      
      if (action === 'create' && field.field_is_required && (value === undefined || value === null)) {
        errors.push(`Field '${field.field_name}' is required`);
        continue;
      }

      if (action === 'update' && value === undefined) continue;

      if (value !== null && value !== undefined) {
            if (!this.validateFieldType(value, field.field_type)) {
      errors.push(`Field '${field.field_name}' must be of type ${field.field_type}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new SchemaKitError(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private validateFieldType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'integer': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'date':
      case 'datetime': return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'json':
      case 'object': return typeof value === 'object';
      case 'array': return Array.isArray(value);
      default: return true;
    }
  }

  private buildRLSConditions(context: Context): Array<{ field: string; op: string; value: any }> {
    const conditions: Array<{ field: string; op: string; value: any }> = [];
    
    for (const rule of this.rls) {
      if (rule.rls_config?.conditions) {
        conditions.push(...rule.rls_config.conditions);
      }
    }
    
    return conditions;
  }

  private resolveRLSValue(value: any, context: Context): any {
    if (typeof value === 'string') {
      // Replace simple context tokens like 'currentUser.id' or '$context.user.id'
      if (value === 'currentUser.id' || value === '$context.user.id') return context.user?.id;
      if (value === 'currentUser.department' || value === '$context.user.department') return (context as any).user?.department;
    }
    return value;
  }

  private async executeWorkflows(event: string, oldData: any, newData: any, context: Context): Promise<void> {
    const applicableWorkflows = this.workflow.filter(w => w.workflow_trigger_event === event);
    
    for (const workflow of applicableWorkflows) {
              console.log(`Executing workflow: ${workflow.workflow_name} for event: ${event}`);
    }
  }

  private async ensureTable(): Promise<void> {
    // No-op for now. Implement table creation logic in DB if needed.
    return;
  }

  static clearCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      Entity.cache.delete(`${tenantId}:${entityName}`);
    } else if (entityName) {
      const keysToDelete = Array.from(Entity.cache.keys())
        .filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => Entity.cache.delete(key));
    } else {
      Entity.cache.clear();
    }
  }

  static getCacheStats(): { size: number; entities: string[] } {
    return {
      size: Entity.cache.size,
      entities: Array.from(Entity.cache.keys())
    };
  }
}