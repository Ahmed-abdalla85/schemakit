/**
 * Entity - Refactored for Simplicity and Purpose-Driven Architecture
 */
import { DB } from '../../database/db';
import { 
  EntityConfiguration, EntityDefinition, FieldDefinition, PermissionDefinition, 
  ViewDefinition, WorkflowDefinition, RLSDefinition, Context, ValidationResult 
} from '../../types';
import { SchemaKitError } from '../../errors';
import { generateId } from '../../utils/id-generation';
import { getCurrentTimestamp } from '../../utils/date-helpers';
import { safeJsonParse } from '../../utils/json-helpers';


export class Entity {
  private static cache = new Map<string, Entity>();
  
  private readonly entityName: string;
  private readonly tenantId: string;
  private readonly db: DB;
  private initialized = false;
  
  public fields: FieldDefinition[] = [];
  public permissions: PermissionDefinition[] = [];
  public workflow: WorkflowDefinition[] = [];
  public rls: RLSDefinition[] = [];
  public views: ViewDefinition[] = [];
  private entityDefinition: EntityDefinition | null = null;
  static create(entityName: string, tenantId: string, db: DB): Entity {
    const cacheKey = `${tenantId}:${entityName}`;
    if (Entity.cache.has(cacheKey)) return Entity.cache.get(cacheKey)!;
    const entity = new Entity(entityName, tenantId, db);
    Entity.cache.set(cacheKey, entity);
    return entity;
  }

  private constructor(entityName: string, tenantId: string, db: DB) {
    this.entityName = entityName;
    this.tenantId = tenantId;
    this.db = db;
  }

  get isInitialized(): boolean { return this.initialized; }
  async initialize(context: Context = {}): Promise<void> {
    if (this.initialized) return;

    const contextWithTenant = { ...context, tenantId: this.tenantId };
   
    try {
      // Load entity definition first
      this.entityDefinition = await this.loadEntityDefinition();
      if (!this.entityDefinition) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      const [fields, permissions, workflows, views] = await Promise.all([
        this.loadFields(this.entityDefinition.entity_id),
        this.loadPermissions(this.entityDefinition.entity_id, contextWithTenant),
        this.loadWorkflows(this.entityDefinition.entity_id),
        // this.loadRLS(this.entityDefinition.entity_id, contextWithTenant),
        this.loadViews(this.entityDefinition.entity_id)
      ]);
      this.fields = fields;
      this.permissions = permissions;
      this.workflow = workflows;
      this.rls = [];
      this.views = views;
      await this.ensureTable();
      this.initialized = true;
    } catch (error) {
      console.log(error,"error")
      throw new SchemaKitError(`Failed to initialize entity '${this.entityName}': ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Create a new record
   */
  async create(data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('create', contextWithTenant);
    this.validateData(data, 'create');

    // Add system fields
    const enrichedData = {
      ...data,
      id: data.id || generateId(),
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
      ...(contextWithTenant.user?.id && {
        created_by: contextWithTenant.user.id,
        updated_by: contextWithTenant.user.id
      })
    };

    // Use DB insert
    await this.db.insert(this.getTableName(), enrichedData);

    await this.executeWorkflows('create', null, enrichedData, contextWithTenant);
    return enrichedData;
  }

  /**
   * Read records with optional filters
   */
  async read(filters: Record<string, any> = {}, context: Context = {}): Promise<Record<string, any>[]> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('read', contextWithTenant);

    let query = this.db.select('*').from(this.getTableName());

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      query = query.where({ [field]: value });
    }

    // Apply RLS conditions
    const rlsConditions = this.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: condition.value });
    }

    return await query.get();
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('update', contextWithTenant);
    this.validateData(data, 'update');

    // Get old data for workflow
    const oldData = await this.findById(id, contextWithTenant);
    if (!oldData) {
      throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      ...data,
      updated_at: getCurrentTimestamp(),
      ...(contextWithTenant.user?.id && { updated_by: contextWithTenant.user.id })
    };
    delete updateData.id; // Remove ID from update data

    // Use DB update
    await this.db.update(this.getTableName(), updateData);

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
    const oldData = await this.findById(id, contextWithTenant);
    if (!oldData) {
      throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    }

    // Use DB delete
    await this.db.delete(this.getTableName());

    await this.executeWorkflows('delete', oldData, null, contextWithTenant);
    return true;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.checkPermission('read', contextWithTenant);

    let query = this.db.select('*').from(this.getTableName()).where({ id });

    // Apply RLS conditions
    const rlsConditions = this.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: condition.value });
    }

    const results = await query.get();
    return results && results.length > 0 ? results[0] : null;
  }

  // === PRIVATE HELPER METHODS ===

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getTableName(): string {
    return this.entityDefinition?.entity_table_name || this.entityName;
  }

  private async loadEntityDefinition(): Promise<EntityDefinition | null> {
    const results = await this.db
      .select('*')
      .from('system_entities')
      .where({ entity_status: 'active', entity_name: this.entityName })
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
      // .where({ field_entity_id: entityId, field_status: 'active' })
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
    // Use .db query builder for role filtering
    let query = this.db.select('*')
                    .from('system_permissions')
                    // .where({ permission_entity_id: entityId, permission_status: 'active' });
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
      // .where({ workflow_entity_id: entityId, workflow_status: 'active' })
      .get();

    // Optionally sort in JS if needed
    workflows.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

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

  // private async loadRLS(entityId: string, context: Context): Promise<RLSDefinition[]> {
  //   const userRoles = context.user?.roles || ['public'];
  //   let query = this.db.select('*').from('system_rls').where({ entity_id: entityId, is_active: 1 });
  //   if (userRoles.length > 0) {
  //     query = query.where({ role: userRoles[0] }); // TODO: support multi-role IN
  //   }
  //   const rlsRules = await query.get();

  //   return rlsRules.map((rule: any) => ({
  //     ...rule,
  //     rls_config: rule.rls_config && typeof rule.rls_config === 'string'
  //       ? safeJsonParse(rule.rls_config, { relationbetweenconditions: 'and', conditions: [] })
  //       : rule.rls_config
  //   }));
  // }

  private async loadViews(entityId: string): Promise<ViewDefinition[]> {
    const views = await this.db
      .select('*')
      .from('system_views')
      .where({ "system_views.view_entity_id": entityId })
      .get();

    return views.map((view: any) => ({
      ...view,
      query_config: view.query_config && typeof view.query_config === 'string'
        ? safeJsonParse(view.query_config, {})
        : view.query_config
    }));
  }

  private async checkPermission(action: string, context: Context): Promise<void> {
    const userRoles = context.user?.roles || ['public'];
    const hasPermission = this.permissions.some(p => 
      userRoles.includes(p.role) && 
      p.action === action && 
      p.is_allowed
    );

    // if (!hasPermission) {
    //   throw new SchemaKitError(`Permission denied: ${action} on ${this.entityName}`);
    // }
  }

  private validateData(data: Record<string, any>, action: 'create' | 'update'): void {
    const errors: string[] = [];

    for (const field of this.fields) {
      const value = data[field.name];
      
      if (action === 'create' && field.is_required && (value === undefined || value === null)) {
        errors.push(`Field '${field.name}' is required`);
        continue;
      }

      if (action === 'update' && value === undefined) continue;

      if (value !== null && value !== undefined) {
        if (!this.validateFieldType(value, field.type)) {
          errors.push(`Field '${field.name}' must be of type ${field.type}`);
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

  private async executeWorkflows(event: string, oldData: any, newData: any, context: Context): Promise<void> {
    const applicableWorkflows = this.workflow.filter(w => w.trigger_event === event);
    
    for (const workflow of applicableWorkflows) {
      console.log(`Executing workflow: ${workflow.name} for event: ${event}`);
    }
  }

  private async ensureTable(): Promise<void> {
    // No-op for now. Implement table creation logic in DB if needed.
    return;
  }

  private mapFieldTypeToSQL(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'VARCHAR(255)',
      number: 'DECIMAL(10,2)',
      integer: 'INTEGER',
      boolean: 'BOOLEAN',
      date: 'DATE',
      datetime: 'DATETIME',
      json: 'TEXT',
      object: 'TEXT',
      array: 'TEXT',
      reference: 'VARCHAR(255)'
    };
    return typeMap[fieldType] || 'VARCHAR(255)';
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