import type { Context, EntityConfiguration } from '../types';
import type { SchemaLoader } from './schema-loader';
import type { EntityManager } from './entity-manager';
import type { ValidationManager } from './validation-manager';
import type { PermissionManager } from './permission-manager';
import type { WorkflowManager } from './workflow-manager';

import { SchemaKitError } from '../errors';

export class EntityAPI {
  private entityCache?: EntityConfiguration;

  constructor(
    private readonly entityName: string,
    private readonly schemaLoader: SchemaLoader,
    private readonly entityManager: EntityManager,
    private readonly validationManager: ValidationManager,
    private readonly permissionManager: PermissionManager,
    private readonly workflowManager: WorkflowManager
  ) {}

  // ----- CRUD Operations -----

  async create(data: Record<string, any>, context: Context = {}) {
    const entityConfig = await this.loadEntityConfig(context);

    await this.enforcePermission(entityConfig, 'create', context);
    await this.validateData(entityConfig, data, 'create');

    const result = await this.entityManager.create(entityConfig, data, context);

    await this.workflowManager.executeWorkflows(entityConfig, 'create', null, result, context);

    return result;
  }

  async read(filters: Record<string, any> = {}, context: Context = {}) {
    const entityConfig = await this.loadEntityConfig(context);

    await this.enforcePermission(entityConfig, 'read', context);

    // Convert filters object to conditions array
    const conditions = Object.entries(filters).map(([field, value]) => ({
      field,
      value,
      operator: 'eq'
    }));

    return this.entityManager.find(entityConfig, conditions, {}, context);
  }

  async update(id: string | number, data: Record<string, any>, context: Context = {}) {
    const entityConfig = await this.loadEntityConfig(context);

    await this.enforcePermission(entityConfig, 'update', context);
    await this.validateData(entityConfig, data, 'update');

    const oldData = await this.entityManager.findById(entityConfig, id, context);
    const result = await this.entityManager.update(entityConfig, id, data, context);

    await this.workflowManager.executeWorkflows(entityConfig, 'update', oldData, result, context);

    return result;
  }

  async delete(id: string | number, context: Context = {}) {
    const entityConfig = await this.loadEntityConfig(context);

    await this.enforcePermission(entityConfig, 'delete', context);

    const oldData = await this.entityManager.findById(entityConfig, id, context);
    const result = await this.entityManager.delete(entityConfig, id, context);

    await this.workflowManager.executeWorkflows(entityConfig, 'delete', oldData, null, context);

    return result;
  }

  async findById(id: string | number, context: Context = {}) {
    const entityConfig = await this.loadEntityConfig(context);

    await this.enforcePermission(entityConfig, 'read', context);

    return this.entityManager.findById(entityConfig, id, context);
  }

  // ----- Schema and Configuration getters -----

  get schema() {
    return this.loadEntityConfig().then(config => this.generateJsonSchema(config));
  }

  get fields() {
    return this.loadEntityConfig().then(config => config.fields);
  }

  get permissions() {
    return this.loadEntityConfig().then(config => config.permissions);
  }

  get workflows() {
    return this.loadEntityConfig().then(config => config.workflows);
  }

  get views() {
    return this.loadEntityConfig().then(config => config.views);
  }

  // ----- Cache management -----

  clearCache() {
    this.entityCache = undefined;
  }

  async reload() {
    this.clearCache();
    await this.loadEntityConfig();
  }

  // ----- Private helpers -----

  private async loadEntityConfig(context: Context = {}): Promise<EntityConfiguration> {
    if (!this.entityCache) {
      this.entityCache = await this.schemaLoader.loadEntity(this.entityName, context);
    }
    return this.entityCache!;
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
