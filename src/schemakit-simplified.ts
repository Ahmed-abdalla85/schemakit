/**
 * SchemaKit - Simplified Core Class
 * Focused on essential functionality only
 */
import { DatabaseAdapter } from './database/adapter';
import { EntityConfiguration, Context } from './types';
import { SchemaLoader } from './core/schema-loader';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { WorkflowManager } from './core/workflow-manager';
import { FileLoader } from './core/file-loader';
import { SchemaKitError } from './errors';

export interface SchemaKitOptions {
  adapter?: {
    type?: string;
    config?: Record<string, any>;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

/**
 * SchemaKit - Simplified main class
 * Focus: Core entity management only
 */
export class SchemaKit {
  private databaseAdapter: DatabaseAdapter;
  private options: SchemaKitOptions;
  private schemaLoader!: SchemaLoader;
  private entityManager!: EntityManager;
  private validationManager!: ValidationManager;
  private permissionManager!: PermissionManager;
  private workflowManager!: WorkflowManager;

  // Simple entity cache
  private entityCache: Map<string, EntityConfiguration> = new Map();

  constructor(options: SchemaKitOptions = {}) {
    this.options = options;
    const adapterType = options.adapter?.type || 'inmemory';
    const adapterConfig = options.adapter?.config || {};
    this.databaseAdapter = this.createDatabaseAdapter(adapterType, adapterConfig);
  }

  /**
   * Initialize SchemaKit
   */
  async init(): Promise<SchemaKit> {
    try {
      await this.databaseAdapter.connect();
      
      if (!await this.isInstalled()) {
        await this.install();
      }

      // Initialize core managers
      this.schemaLoader = new SchemaLoader(this.databaseAdapter);
      this.entityManager = new EntityManager(this.databaseAdapter);
      this.validationManager = new ValidationManager();
      this.permissionManager = new PermissionManager(this.databaseAdapter);
      this.workflowManager = new WorkflowManager(this.databaseAdapter);

      return this;
    } catch (error) {
      throw new SchemaKitError(`Failed to initialize SchemaKit: ${error}`);
    }
  }

  /**
   * Get entity object for CRUD operations
   */
  entity(entityName: string) {
    const self = this;
    return {
      async create(data: Record<string, any>, context: Context = {}) {
        return await self.createEntity(entityName, data, context);
      },

      async read(filters: Record<string, any> = {}, context: Context = {}) {
        return await self.readEntity(entityName, filters, context);
      },

      async update(id: string | number, data: Record<string, any>, context: Context = {}) {
        return await self.updateEntity(entityName, id, data, context);
      },

      async delete(id: string | number, context: Context = {}) {
        return await self.deleteEntity(entityName, id, context);
      },

      async findById(id: string | number, context: Context = {}) {
        return await self.findByIdEntity(entityName, id, context);
      },

      get schema() {
        return self.getEntitySchema(entityName);
      }
    };
  }

  /**
   * Check if database is installed
   */
  private async isInstalled(): Promise<boolean> {
    try {
      const result = await this.databaseAdapter.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'system_entities'"
      );
      return result.length > 0 && result[0].count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Install database schema
   */
  private async install(): Promise<void> {
    try {
      const schemaSql = await FileLoader.loadSchemaFile();
      await this.databaseAdapter.execute(schemaSql);

      const seedSql = await FileLoader.loadSeedFile();
      if (seedSql) {
        await this.databaseAdapter.execute(seedSql);
      }
    } catch (error) {
      throw new SchemaKitError(`Failed to install database: ${error}`);
    }
  }

  /**
   * Load entity configuration
   */
  private async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    if (this.entityCache.has(entityName)) {
      return this.entityCache.get(entityName)!;
    }

    const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
    this.entityCache.set(entityName, entityConfig);
    return entityConfig;
  }

  /**
   * Clear entity cache
   */
  clearEntityCache(entityName?: string): void {
    if (entityName) {
      this.entityCache.delete(entityName);
    } else {
      this.entityCache.clear();
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.databaseAdapter.disconnect();
  }

  // === PRIVATE CRUD METHODS ===

  private async createEntity(entityName: string, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    const entityConfig = await this.loadEntity(entityName, context);
    
    // Check permission
    const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'create', context);
    if (!hasPermission) {
      throw new SchemaKitError('Permission denied: create');
    }

    // Validate data
    const validation = await this.validationManager.validate(entityConfig, data, 'create');
    if (!validation.isValid) {
      throw new SchemaKitError(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Create record
    const result = await this.entityManager.create(entityConfig, data, context);

    // Execute workflows
    await this.workflowManager.executeWorkflows(entityConfig, 'create', null, result, context);

    return result;
  }

  private async readEntity(entityName: string, filters: Record<string, any> = {}, context: Context = {}): Promise<any> {
    const entityConfig = await this.loadEntity(entityName, context);
    
    const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
    if (!hasPermission) {
      throw new SchemaKitError('Permission denied: read');
    }

    return await this.entityManager.find(entityConfig, [], { limit: 10 }, context);
  }

  private async updateEntity(entityName: string, id: string | number, data: Record<string, any>, context: Context = {}): Promise<Record<string, any>> {
    const entityConfig = await this.loadEntity(entityName, context);
    
    const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'update', context);
    if (!hasPermission) {
      throw new SchemaKitError('Permission denied: update');
    }

    const validation = await this.validationManager.validate(entityConfig, data, 'update');
    if (!validation.isValid) {
      throw new SchemaKitError(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    const oldData = await this.entityManager.findById(entityConfig, id, context);
    const result = await this.entityManager.update(entityConfig, id, data, context);

    await this.workflowManager.executeWorkflows(entityConfig, 'update', oldData, result, context);

    return result;
  }

  private async deleteEntity(entityName: string, id: string | number, context: Context = {}): Promise<boolean> {
    const entityConfig = await this.loadEntity(entityName, context);
    
    const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'delete', context);
    if (!hasPermission) {
      throw new SchemaKitError('Permission denied: delete');
    }

    const oldData = await this.entityManager.findById(entityConfig, id, context);
    const result = await this.entityManager.delete(entityConfig, id, context);

    await this.workflowManager.executeWorkflows(entityConfig, 'delete', oldData, null, context);

    return result;
  }

  private async findByIdEntity(entityName: string, id: string | number, context: Context = {}): Promise<Record<string, any> | null> {
    const entityConfig = await this.loadEntity(entityName, context);
    
    const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
    if (!hasPermission) {
      throw new SchemaKitError('Permission denied: read');
    }

    return await this.entityManager.findById(entityConfig, id, context);
  }

  private async getEntitySchema(entityName: string): Promise<any> {
    const entityConfig = await this.loadEntity(entityName);
    return this.generateJsonSchema(entityConfig);
  }

  private generateJsonSchema(entityConfig: EntityConfiguration): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of entityConfig.fields) {
      properties[field.name] = {
        type: this.mapFieldTypeToJsonSchema(field.type),
        description: field.description
      };

      if (field.is_required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
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
      reference: 'string'
    };
    return typeMap[type] || 'string';
  }

  private createDatabaseAdapter(type: string, config: Record<string, any>): DatabaseAdapter {
    switch (type.toLowerCase()) {
      case 'postgres':
        const { PostgresAdapter } = require('./database/adapters/postgres');
        return new PostgresAdapter(config);
      case 'sqlite':
        const { SQLiteAdapter } = require('./database/adapters/sqlite');
        return new SQLiteAdapter(config);
      case 'inmemory':
      default:
        const { InMemoryAdapter } = require('./database/adapters/inmemory');
        return new InMemoryAdapter(config);
    }
  }
}