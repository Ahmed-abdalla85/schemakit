import type { Context, EntityConfiguration } from '../types';
import type { EntityManager } from './entity-manager';
import type { EntityDataManager } from './entity-data-manager';
import type { ValidationManager } from './validation-manager';
import type { PermissionManager } from './permission-manager';
import type { WorkflowManager } from './workflow-manager';

import { SchemaKitError } from '../errors';

export class EntityAPI {
  private entityCache?: EntityConfiguration;

  constructor(
    private readonly entityName: string,
    private readonly entityManager: EntityManager,
    private readonly entityDataManager: EntityDataManager,
    private readonly validationManager: ValidationManager,
    private readonly permissionManager: PermissionManager,
    private readonly workflowManager: WorkflowManager,
    private readonly tenantId: string = 'default'
  ) {}

  // ----- CRUD Operations -----

  async create(data: Record<string, any>, context: Context = {}) {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    const entityConfig = await this.loadEntityConfig(contextWithTenant);

    await this.enforcePermission(entityConfig, 'create', contextWithTenant);
    await this.validateData(entityConfig, data, 'create');

    const result = await this.entityDataManager.insertData(entityConfig, data, contextWithTenant);

    await this.workflowManager.executeWorkflows(entityConfig, 'create', null, result, contextWithTenant);

    return result;
  }

  async read(filters: Record<string, any> = {}, context: Context = {}) {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    const entityConfig = await this.loadEntityConfig(contextWithTenant);

    await this.enforcePermission(entityConfig, 'read', contextWithTenant);

    // Convert filters object to conditions array
    const conditions = Object.entries(filters).map(([field, value]) => ({
      field,
      value,
      operator: 'eq'
    }));

    return this.entityDataManager.findData(entityConfig, conditions, {}, contextWithTenant);
  }

  async update(id: string | number, data: Record<string, any>, context: Context = {}) {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    const entityConfig = await this.loadEntityConfig(contextWithTenant);

    await this.enforcePermission(entityConfig, 'update', contextWithTenant);
    await this.validateData(entityConfig, data, 'update');

    const oldData = await this.entityDataManager.findByIdData(entityConfig, id, contextWithTenant);
    const result = await this.entityDataManager.updateData(entityConfig, id, data, contextWithTenant);

    await this.workflowManager.executeWorkflows(entityConfig, 'update', oldData, result, contextWithTenant);

    return result;
  }

  async delete(id: string | number, context: Context = {}) {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    const entityConfig = await this.loadEntityConfig(contextWithTenant);

    await this.enforcePermission(entityConfig, 'delete', contextWithTenant);

    const oldData = await this.entityDataManager.findByIdData(entityConfig, id, contextWithTenant);
    const result = await this.entityDataManager.deleteData(entityConfig, id, contextWithTenant);

    await this.workflowManager.executeWorkflows(entityConfig, 'delete', oldData, null, contextWithTenant);

    return result;
  }

  async findById(id: string | number, context: Context = {}) {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    const entityConfig = await this.loadEntityConfig(contextWithTenant);

    await this.enforcePermission(entityConfig, 'read', contextWithTenant);

    return this.entityDataManager.findByIdData(entityConfig, id, contextWithTenant);
  }

  // ----- Schema and Configuration getters -----

  get schema() {
    return this.loadEntityConfig({ tenantId: this.tenantId }).then(config => this.generateJsonSchema(config));
  }

  get fields() {
    return this.loadEntityConfig({ tenantId: this.tenantId }).then(config => config.fields);
  }

  get permissions() {
    return this.loadEntityConfig({ tenantId: this.tenantId }).then(config => config.permissions);
  }

  get workflows() {
    return this.loadEntityConfig({ tenantId: this.tenantId }).then(config => config.workflows);
  }

  get views() {
    return this.loadEntityConfig({ tenantId: this.tenantId }).then(config => config.views);
  }

  // ----- Cache management -----

  clearCache() {
    this.entityCache = undefined;
  }

  async reload() {
    this.clearCache();
    await this.loadEntityConfig();
  }

  // ----- Private helper methods -----

  private async loadEntityConfig(context: Context = {}): Promise<EntityConfiguration> {
    const contextWithTenant = { ...context, tenantId: this.tenantId };
    
    if (this.entityCache) {
      return this.entityCache;
    }

    try {
      this.entityCache = await this.entityManager.loadEntity(this.entityName, contextWithTenant);
      return this.entityCache;
    } catch (error) {
      throw new SchemaKitError(`Failed to load entity '${this.entityName}' for tenant '${this.tenantId}': ${error instanceof Error ? error.message : error}`);
    }
  }

  private async enforcePermission(
    entityConfig: EntityConfiguration,
    action: string,
    context: Context
  ) {
    const allowed = await this.permissionManager.checkPermission(entityConfig, action, context);
    if (!allowed) throw new SchemaKitError(`Permission denied: ${action}`);
  }

  private async validateData(
    entityConfig: EntityConfiguration,
    data: Record<string, any>,
    action: 'create' | 'update'
  ) {
    const validation = await this.validationManager.validate(entityConfig, data, action);
    if (!validation.isValid) {
      throw new SchemaKitError(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }
  }

  private generateJsonSchema(entityConfig: EntityConfiguration) {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of entityConfig.fields) {
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
}
