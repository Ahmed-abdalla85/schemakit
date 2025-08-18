import { DB } from '../../database/db';
import { 
  EntityDefinition, FieldDefinition, Context 
} from '../../types/core';
import { PermissionDefinition, RLSDefinition } from '../../types/permissions';
import { ViewDefinition } from '../../types/views';
import { WorkflowDefinition } from '../../types/workflows';
import { SchemaKitError } from '../../errors';
import { buildCreateRow, buildUpdateRow, getPrimaryKeyColumn } from '../system-fields';
import { safeJsonParse } from '../../utils/json-helpers';
import { ViewManager } from '../views/view-manager';
import { MetadataLoader } from '../metadata-loader';
import { PermissionGuard } from '../permission-guard';
import { EntityRepository } from '../entity-repository';
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
  private metadataLoader: MetadataLoader;
  private permissionGuard: PermissionGuard | null = null;
  private repository: EntityRepository | null = null;
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
    const prefix = this.entityDefinition?.entity_column_prefix || this.tableName;
    return getPrimaryKeyColumn(prefix);
  }

  private constructor(entityName: string, tenantId: string, db: DB) {
    this.entityName = entityName;
    this.tenantId = tenantId;
    this.db = db;
    this.metadataLoader = new MetadataLoader(db);
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
      this.entityDefinition = await this.metadataLoader.loadEntityDefinition(this.entityName);
      if (!this.entityDefinition) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      // Load metadata sequentially to keep deterministic mock expectations
      const fields = await this.metadataLoader.loadFields(this.entityDefinition.entity_id);
      const permissions = await this.metadataLoader.loadPermissions(this.entityDefinition.entity_id);
      const workflows = await this.metadataLoader.loadWorkflows(this.entityDefinition.entity_id);
      const views = await this.metadataLoader.loadViews(this.entityDefinition.entity_id);
      const rls = await this.metadataLoader.loadRLS(this.entityDefinition.entity_id);
      this.fields = fields;
      this.permissions = permissions;
      this.workflow = workflows;
      this.rls = rls;
      this.views = views;
      this.tableName = this.entityDefinition.entity_table_name || this.entityName;
      await this.ensureTable();
      this.repository = new EntityRepository(this.db, this.tableName);
      this.permissionGuard = new PermissionGuard(() => this.permissions, () => this.rls);
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

    await this.permissionGuard!.check('read', contextWithTenant);

    let query = this.db.select('*').from(this.tableName);

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      query = query.where({ [field]: value });
    }

    // Apply RLS conditions using equality fallbacks for now
    const rlsConditions = this.permissionGuard!.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.permissionGuard!.resolveRLSValue(condition.value, contextWithTenant) });
    }

    return await query.get();
  }


  /**
   * Find a record by ID
   */
  async getById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.permissionGuard!.check('read', contextWithTenant);

    const idField = this.getPrimaryKeyFieldName();
    let query = this.db.select('*').from(this.tableName).where({ [idField]: id });

    // Apply RLS conditions using equality fallbacks for now
    const rlsConditions = this.permissionGuard!.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.permissionGuard!.resolveRLSValue(condition.value, contextWithTenant) });
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

    await this.permissionGuard!.check('create', contextWithTenant);
    
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
    const columnPrefix = this.entityDefinition?.entity_column_prefix || this.tableName;
    const enrichedData = buildCreateRow(data, columnPrefix, contextWithTenant);

    // Use DB insert
    await this.repository!.insert(enrichedData);

    await this.executeWorkflows('create', null, enrichedData, contextWithTenant);
    return enrichedData;
  }

  

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };

    await this.permissionGuard!.check('update', contextWithTenant);
    
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
    const columnPrefix = this.entityDefinition?.entity_column_prefix || this.tableName;
    const updateData: Record<string, any> = buildUpdateRow(data, columnPrefix, contextWithTenant);

    // Use DB update (filter by id)
    const idField = this.getPrimaryKeyFieldName();
    await this.repository!.update(idField, id, updateData);

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

    await this.permissionGuard!.check('delete', contextWithTenant);

    // Get old data for workflow
    const oldData = await this.getById(id, contextWithTenant);
    if (!oldData) {
      throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    }

    // Use DB delete (filter by id)
    const idField = this.getPrimaryKeyFieldName();
    await this.repository!.delete(idField, id);

    await this.executeWorkflows('delete', oldData, null, contextWithTenant);
    return true;
  }

  

  // === PRIVATE HELPER METHODS ===

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
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