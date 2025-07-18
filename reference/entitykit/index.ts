// Main SchemaKit class

import { DbAdapter, DrizzleDbAdapter, PostgresDbAdapter, InMemoryDbAdapter } from './adapters';
import { UnifiedEntityHandler } from './core';
import { EntityConfig } from './types';

export class SchemaKit {
  private dbAdapter: DbAdapter;
  private entityCache: Map<string, UnifiedEntityHandler> = new Map();

  constructor(options: { adapterName: 'drizzle' | 'postgres' | 'inmemory'; connectionString: string }) {
    // Initialize database adapter
    switch (options.adapterName) {
      case 'drizzle':
        this.dbAdapter = new DrizzleDbAdapter(options.connectionString);
        break;
      case 'postgres':
        this.dbAdapter = new PostgresDbAdapter(options.connectionString);
        break;
      case 'inmemory':
        this.dbAdapter = new InMemoryDbAdapter();
        break;
      default:
        throw new Error('Unsupported adapter');
    }

  }

  // Static instance management
  private static defaultInstance: SchemaKit | null = null;

  static initDefault(options: { adapterName: 'drizzle' | 'postgres' | 'inmemory'; connectionString: string }) {
    if (!this.defaultInstance) {
      this.defaultInstance = new SchemaKit(options);
    }
  }

  static getDefault(): SchemaKit {
    if (!this.defaultInstance) {
      throw new Error('SchemaKit not initialized. Call initDefault first.');
    }
    return this.defaultInstance;
  }

  static async getEntity(entityName: string, tenantId: string, instance?: SchemaKit): Promise<UnifiedEntityHandler> {
    const kit = instance || this.getDefault();
    return await kit.getEntityInstance(entityName, tenantId);
  }

  // Main entity loading method
  async getEntityInstance(entityName: string, tenantId: string): Promise<UnifiedEntityHandler> {
    const cacheKey = `${tenantId}:${entityName}`;
    
    // Check cache first
    if (this.entityCache.has(cacheKey)) {
      return this.entityCache.get(cacheKey)!;
    }

    // Load entity configuration from database
    const config = await this.loadEntityConfiguration(entityName, tenantId);
    if (!config) {
      throw new Error(`Entity '${entityName}' not found for tenant '${tenantId}'`);
    }

    // Create UnifiedEntityHandler instance with all context bound
    const entity = new UnifiedEntityHandler(
      this.dbAdapter,
      config,
      tenantId
    );
    
    // Cache the entity
    this.entityCache.set(cacheKey, entity);
    
    return entity;
  }

  private async loadEntityConfiguration(entityName: string, tenantId: string): Promise<EntityConfig | null> {
    try {
      // Load main entity record
      const entityResult = await this.dbAdapter.select(
        'system_entities', 
        [{ field: 'entity_name', value: entityName }], 
        { limit: 1 }, 
        tenantId
      );
      
      // Extract data from result (handle different result formats)
      const entities = Array.isArray(entityResult) ? entityResult : [];
      
      if (!entities.length) {
        return null;
      }

      const entity = entities[0];
      
      // Load all related configurations in parallel
      const [fieldsResult, permissionsResult, workflowsResult, viewsResult] = await Promise.all([
        this.dbAdapter.select('system_fields', [{ field: 'field_entity_id', value: entity.entity_id }], {}, tenantId),
        this.dbAdapter.select('system_permissions', [{ field: 'permission_entity_id', value: entity.entity_id }], {}, tenantId),
        this.dbAdapter.select('system_workflows', [{ field: 'workflow_entity_id', value: entity.entity_id }], {}, tenantId),
        this.dbAdapter.select('system_views', [{ field: 'view_entity_id', value: entity.entity_id }], {}, tenantId)
      ]);

      // Extract data from results (handle different result formats)
      const fields = Array.isArray(fieldsResult) ? fieldsResult : [];
      const permissions = Array.isArray(permissionsResult) ? permissionsResult : [];
      const workflows = Array.isArray(workflowsResult) ? workflowsResult : [];
      const views = Array.isArray(viewsResult) ? viewsResult : [];

      return {
        entity,
        fields,
        permissions,
        workflow: workflows,
        views
      };

    } catch (error) {
      console.error(`Failed to load entity configuration for ${entityName}:`, error);
      return null;
    }
  }

  // Static utility methods
  static clearEntityCache(entityName: string, tenantId: string): void {
    const kit = this.getDefault();
    const cacheKey = `${tenantId}:${entityName}`;
    kit.entityCache.delete(cacheKey);
  }

  static clearAllCache(): void {
    const kit = this.getDefault();
    kit.entityCache.clear();
  }

  static getCacheStats() {
    const kit = this.getDefault();
    return {
      entityCacheSize: kit.entityCache.size,
      entities: Array.from(kit.entityCache.keys())
    };
  }
} 

export { UnifiedEntityHandler } from './core';
export * from './types';
export * from './adapters'; 