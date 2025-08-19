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
  private readonly metadataLoader: MetadataLoader;
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
    // Default validation adapter to ensure consistent validation paths
    this.validationAdapter = new SimpleValidationAdapter();
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

  async initialize(_context: Context = {}): Promise<void> {
    if (this.initialized) return;
    try {
      this.entityDefinition = await this.metadataLoader.loadEntityDefinition(this.entityName);
      const def = this.entityDefinition;
      if (!def) {
        throw new Error(`Entity '${this.entityName}' not found`);
      }

      const id = def.entity_id;
      this.fields = await this.metadataLoader.loadFields(id);
      this.permissions = await this.metadataLoader.loadPermissions(id);
      this.workflow = await this.metadataLoader.loadWorkflows(id) as any;
      this.views = await this.metadataLoader.loadViews(id);
      this.rls = await this.metadataLoader.loadRLS(id);
      this.tableName = def.entity_table_name || this.entityName;
      await this.ensureTable();

      this.repository = new EntityRepository(this.db, this.tableName);
      this.permissionGuard = new PermissionGuard(() => this.permissions, () => this.rls);

      // Always (re)compile schema now that fields are loaded
      const entityId = def.entity_id || `${this.tenantId}:${this.entityName}`;
      this.compiledSchema = this.validationAdapter!.buildSchema(entityId, this.fields, {
        unknownFieldPolicy: this.unknownFieldPolicy
      });

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
    // Combine filters with basic RLS equality conditions
    const combined: Record<string, any> = { ...filters };
    for (const condition of this.permissionGuard!.buildRLSConditions(contextWithTenant)) {
      combined[condition.field] = this.permissionGuard!.resolveRLSValue(condition.value, contextWithTenant);
    }
    return this.repository!.select(combined);
  }

  async getById(id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('read', contextWithTenant);
    const idField = this.getPrimaryKeyFieldName();
    return this.repository!.findById(idField, id);
  }

  async insert(data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    await this.ensureInitialized();
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    await this.permissionGuard!.check('create', contextWithTenant);
    const resCreate = this.validationAdapter!.validate('create', this.compiledSchema!, data);
    if (!resCreate.ok) {
      throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: (resCreate as any).errors });
    }
    data = { ...data, ...(resCreate as any).data } as Record<string, any>;
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
    const resUpdate = this.validationAdapter!.validate('update', this.compiledSchema!, data);
    if (!resUpdate.ok) {
      throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: (resUpdate as any).errors });
    }
    data = { ...data, ...(resUpdate as any).data } as Record<string, any>;
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

  private getColumnPrefix(): string {
    const raw: string | undefined = (this.entityDefinition as any)?.entity_column_prefix;
    const sanitize = (p: string) => p.replace(/_+$/g, '');
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return sanitize(raw.trim());
    }
    const systemPrefixMap: Record<string, string> = {
      system_entities: 'entity',
      system_fields: 'field',
      system_permissions: 'permission',
      system_views: 'view',
      system_workflows: 'workflow',
      system_rls: 'rls',
    };
    const mapped = systemPrefixMap[this.tableName];
    return mapped ? mapped : this.tableName;
  }
  private getPrimaryKeyFieldName(): string { return getPrimaryKeyColumn(this.getColumnPrefix()); }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Internal type check retained for adapter data coercion expectations
  private validateData(_data: Record<string, any>, _action: 'create' | 'update'): void { /* removed in favor of adapter */ }

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

  private async executeWorkflows(_event: string, _oldData: any, _newData: any, _context: Context): Promise<void> { /* no-op for now */ }

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
