import { DB } from '../database/db';
import { SchemaKitError } from '../errors';
import type { Context, EntityDefinition, FieldDefinition } from '../types/core';
import type { PermissionDefinition, RLSDefinition } from '../types/permissions';
import type { ViewDefinition, ViewOptions, ViewResult } from '../types/views';
import type { WorkflowDefinition } from '../types/workflows';
import type { ValidationAdapter, CompiledSchema, UnknownFieldPolicy } from '../validation/adapter';
import { SimpleValidationAdapter } from '../validation/adapters/simple';
import { ViewManager } from './views/view-manager';
import { MetadataLoader } from './metadata-loader';
import { PermissionGuard } from './permission-guard';
import { EntityRepository } from './entity-repository';
import { buildCreateRow, buildUpdateRow, getPrimaryKeyColumn } from './system-fields';

export class Entity {
  private static cache = new Map<string, Entity>();

  private readonly entityName: string;
  private readonly tenantId: string;
  private readonly db: DB;
  private initialized = false;

  private validationAdapter: ValidationAdapter | null = null;
  private compiledSchema: CompiledSchema | null = null;
  private unknownFieldPolicy: UnknownFieldPolicy = 'strip';

  public fields: FieldDefinition[] = [];
  public permissions: PermissionDefinition[] = [];
  public workflow: WorkflowDefinition[] = [] as any;
  public rls: RLSDefinition[] = [];
  public views: ViewDefinition[] = [];
  private entityDefinition: EntityDefinition | null = null;
  private tableName = '';
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

  private constructor(entityName: string, tenantId: string, db: DB) {
    this.entityName = entityName;
    this.tenantId = tenantId;
    this.db = db;
    this.metadataLoader = new MetadataLoader(db);
  }

  get isInitialized(): boolean { return this.initialized; }
  get name(): string { return this.entityName; }
  get tenant(): string { return this.tenantId; }

  setValidation(adapter: ValidationAdapter, unknownFieldPolicy?: UnknownFieldPolicy): void {
    this.validationAdapter = adapter;
    if (unknownFieldPolicy) this.unknownFieldPolicy = unknownFieldPolicy;
    if (this.initialized) {
      const entityId = (this.entityDefinition as any)?.entity_id || `${this.tenantId}:${this.entityName}`;
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
      this.entityDefinition = await this.metadataLoader.loadEntityDefinition(this.entityName);
      if (!this.entityDefinition) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      const fields = await this.metadataLoader.loadFields(this.entityDefinition.entity_id);
      const permissions = await this.metadataLoader.loadPermissions(this.entityDefinition.entity_id);
      const workflows = await this.metadataLoader.loadWorkflows(this.entityDefinition.entity_id);
      const views = await this.metadataLoader.loadViews(this.entityDefinition.entity_id);
      const rls = await this.metadataLoader.loadRLS(this.entityDefinition.entity_id);
      this.fields = fields;
      this.permissions = permissions;
      this.workflow = workflows as any;
      this.rls = rls;
      this.views = views;
      this.tableName = this.entityDefinition.entity_table_name || this.entityName;
      await this.ensureTable();

      this.repository = new EntityRepository(this.db, this.tableName);
      this.permissionGuard = new PermissionGuard(() => this.permissions, () => this.rls);

      if (this.validationAdapter) {
        const entityId = (this.entityDefinition as any).entity_id || `${this.tenantId}:${this.entityName}`;
        this.compiledSchema = this.validationAdapter.buildSchema(entityId, this.fields, {
          unknownFieldPolicy: this.unknownFieldPolicy
        });
      }

      this.viewManager = new ViewManager(
        this.db,
        this.entityName,
        this.tableName,
        this.fields,
        this.views
      );

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

  async view(viewName: string, options: ViewOptions = {}, context: Context = {}): Promise<ViewResult> {
    await this.ensureInitialized();
    if (!this.viewManager) throw new SchemaKitError('ViewManager not initialized');
    return this.viewManager.executeView(viewName, context, options);
  }

  async get(filters: Record<string, any> = {}, context: Context = {}): Promise<Record<string, any>[]> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('read', contextWithTenant);
    let query = this.db.select('*').from(this.tableName);
    for (const [field, value] of Object.entries(filters)) {
      query = query.where({ [field]: value });
    }
    const rlsConditions = this.permissionGuard!.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.permissionGuard!.resolveRLSValue(condition.value, contextWithTenant) });
    }
    return await query.get();
  }

  async getById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('read', contextWithTenant);
    const idField = this.getPrimaryKeyFieldName();
    let query = this.db.select('*').from(this.tableName).where({ [idField]: id });
    const rlsConditions = this.permissionGuard!.buildRLSConditions(contextWithTenant);
    for (const condition of rlsConditions) {
      query = query.where({ [condition.field]: this.permissionGuard!.resolveRLSValue(condition.value, contextWithTenant) });
    }
    const results = await query.get();
    return results && results.length > 0 ? results[0] : null;
  }

  async insert(data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('create', contextWithTenant);
    if (this.validationAdapter && this.compiledSchema) {
      const res = this.validationAdapter.validate('create', this.compiledSchema, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: (res as any).errors });
      }
      data = (res as any).data as Record<string, any>;
    } else {
      this.validateData(data, 'create');
    }
    const columnPrefix = (this.entityDefinition as any)?.entity_column_prefix || this.tableName;
    const enrichedData = buildCreateRow(data, columnPrefix, contextWithTenant);
    await this.repository!.insert(enrichedData);
    await this.executeWorkflows('create', null, enrichedData, contextWithTenant);
    return enrichedData;
  }

  async update(id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('update', contextWithTenant);
    if (this.validationAdapter && this.compiledSchema) {
      const res = this.validationAdapter.validate('update', this.compiledSchema, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: (res as any).errors });
      }
      data = (res as any).data as Record<string, any>;
    } else {
      this.validateData(data, 'update');
    }
    const oldData = await this.getById(id, contextWithTenant);
    if (!oldData) throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    const columnPrefix = (this.entityDefinition as any)?.entity_column_prefix || this.tableName;
    const updateData: Record<string, any> = buildUpdateRow(data, columnPrefix, contextWithTenant);
    const idField = this.getPrimaryKeyFieldName();
    await this.repository!.update(idField, id, updateData);
    const newData = { ...oldData, ...updateData };
    await this.executeWorkflows('update', oldData, newData, contextWithTenant);
    return newData;
  }

  async delete(id: string | number, context: Context = {}): Promise<boolean> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('delete', contextWithTenant);
    const oldData = await this.getById(id, contextWithTenant);
    if (!oldData) throw new SchemaKitError(`Record not found: ${this.entityName} with ID ${id}`);
    const idField = this.getPrimaryKeyFieldName();
    await this.repository!.delete(idField, id);
    await this.executeWorkflows('delete', oldData, null, contextWithTenant);
    return true;
  }

  private getPrimaryKeyFieldName(): string {
    const prefix = (this.entityDefinition as any)?.entity_column_prefix || this.tableName;
    return getPrimaryKeyColumn(prefix);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private validateData(data: Record<string, any>, action: 'create' | 'update'): void {
    const errors: string[] = [];
    for (const field of this.fields) {
      const value = (data as any)[field.field_name];
      if (action === 'create' && field.field_is_required && (value === undefined || value === null)) {
        errors.push(`Field '${field.field_name}' is required`);
        continue;
      }
      if (action === 'update' && value === undefined) continue;
      if (value !== null && value !== undefined) {
        if (!this.validateFieldType(value, (field as any).field_type as string)) {
          errors.push(`Field '${field.field_name}' must be of type ${(field as any).field_type}`);
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

  private async executeWorkflows(event: string, oldData: any, newData: any, _context: Context): Promise<void> {
    const applicableWorkflows = (this.workflow as any[]).filter((w: any) => w.workflow_trigger_event === event);
    for (const workflow of applicableWorkflows) {
      console.log(`Executing workflow: ${workflow.workflow_name} for event: ${event}`);
    }
  }

  private async ensureTable(): Promise<void> { return; }

  static clearCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      Entity.cache.delete(`${tenantId}:${entityName}`);
    } else if (entityName) {
      const keysToDelete = Array.from(Entity.cache.keys()).filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => Entity.cache.delete(key));
    } else {
      Entity.cache.clear();
    }
  }

  static getCacheStats(): { size: number; entities: string[] } {
    return { size: Entity.cache.size, entities: Array.from(Entity.cache.keys()) };
  }
}

// Backward-compatible default validation adapter if none is set by SchemaKit
// Consumers should prefer passing a ValidationAdapter via SchemaKit
Entity.prototype['setValidation'] = Entity.prototype.setValidation || function (this: any) {
  this.validationAdapter = new SimpleValidationAdapter();
};

// Re-export the Entity class from the former deep path for compatibility
export * from './entity';
