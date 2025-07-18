/**
 * SchemaKit - Main API facade (Refactored)
 */
import { DatabaseAdapter } from './database/adapter';
import { Context, EntityConfiguration, QueryResult } from './types';
import { SchemaKitError } from './errors';
import { SchemaLoader } from './core/schema-loader';
import { EntityManager } from './core/entity-manager';
import { PermissionManager } from './core/permission-manager';
import { QueryManager, QueryBuilder } from './core/query-builder';

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
 * SchemaKit - Dynamic entity management system (Refactored)
 */
export class SchemaKit {
  private databaseAdapter: DatabaseAdapter;
  private options: SchemaKitOptions;
  private schemaLoader!: SchemaLoader;
  private entityManager!: EntityManager;
  private permissionManager!: PermissionManager;
  private queryManager!: QueryManager;

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
    
    // Initialize managers
    this.schemaLoader = new SchemaLoader(this.databaseAdapter, this.options);
    this.entityManager = new EntityManager(this.databaseAdapter);
    this.permissionManager = new PermissionManager(this.databaseAdapter);
    this.queryManager = new QueryManager(this.databaseAdapter);
    
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
   * Check if SchemaKit is installed
   * @returns True if installed, false otherwise
   */
  async isInstalled(): Promise<boolean> {
    return await this.schemaLoader.isSchemaKitInstalled();
  }

  /**
   * Get SchemaKit version
   * @returns Version string or null if not installed
   */
  async getVersion(): Promise<string | null> {
    return await this.schemaLoader.getSchemaKitVersion();
  }

  /**
   * Force reinstall SchemaKit (useful for development/testing)
   * This will recreate all system tables and seed data
   */
  async reinstall(): Promise<void> {
    await this.schemaLoader.reinstall();
  }

  /**
   * Load entity configuration from database
   * @param entityName Entity name
   * @param context User context
   */
  async loadEntity(entityName: string, context: Context = {}): Promise<EntityConfiguration> {
    return this.schemaLoader.loadEntity(entityName, context);
  }

  /**
   * Reload entity configuration from database
   * @param entityName Entity name
   */
  async reloadEntity(entityName: string): Promise<EntityConfiguration> {
    return this.schemaLoader.reloadEntity(entityName);
  }

  /**
   * Get loaded entity names
   */
  getLoadedEntities(): string[] {
    return this.schemaLoader.getLoadedEntities();
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
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'create', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for creating ${entityName}`);
      }
      
      // Create entity using EntityManager
      return await this.entityManager.create(entityConfig, data, context);
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
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Apply RLS conditions
      const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
      
      // Find entity using EntityManager
      return await this.entityManager.findById(entityConfig, id, context, rlsConditions);
    } catch (error) {
      throw new SchemaKitError(`Failed to find ${entityName} with id ${id}: ${error}`);
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
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'update', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for updating ${entityName}`);
      }
      
      // Apply RLS conditions
      const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
      
      // Update entity using EntityManager
      return await this.entityManager.update(entityConfig, id, data, context, rlsConditions);
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
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'delete', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for deleting ${entityName}`);
      }
      
      // Apply RLS conditions
      const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
      
      // Delete entity using EntityManager
      return await this.entityManager.delete(entityConfig, id, context, rlsConditions);
    } catch (error) {
      throw new SchemaKitError(`Failed to delete ${entityName} with id ${id}: ${error}`);
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
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Execute view using QueryManager
      return await this.queryManager.executeView(entityConfig, viewName, params, context);
    } catch (error) {
      throw new SchemaKitError(`Failed to execute view '${viewName}' for entity '${entityName}': ${error}`);
    }
  }

  /**
   * Execute custom query
   * @param entityName Entity name
   * @param queryBuilder Query builder function
   * @param context User context
   */
  async query(
    entityName: string,
    queryBuilder: (query: QueryBuilder) => QueryBuilder,
    context: Context = {}
  ): Promise<QueryResult> {
    try {
      // Load entity configuration
      const entityConfig = await this.loadEntity(entityName, context);
      
      // Check permission
      const hasPermission = await this.permissionManager.checkPermission(entityConfig, 'read', context);
      if (!hasPermission) {
        throw new SchemaKitError(`Permission denied for reading ${entityName}`);
      }
      
      // Execute custom query using QueryManager
      return await this.queryManager.executeCustomQuery(entityConfig, queryBuilder, context);
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
      // Load entity configuration (without using loadEntity to avoid circular dependency)
      const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
      
      // Check permission using PermissionManager
      return await this.permissionManager.checkPermission(entityConfig, action, context);
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
      // Load entity configuration
      const entityConfig = await this.schemaLoader.loadEntity(entityName, context);
      
      // Get permissions using PermissionManager
      return await this.permissionManager.getEntityPermissions(entityConfig, context);
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