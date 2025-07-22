import { SchemaKitOptions } from './types';
import { DB } from './database/db';
import { Entity } from './entities/entity/entity';
import { SchemaKitError } from './errors';

export class SchemaKit {
  private readonly options: Readonly<SchemaKitOptions>;
  private readonly db: DB;

  constructor(options: SchemaKitOptions = {}) {
    this.options = options;
    const adapterConfig = options.adapter || {};
    // Allow tenantId in config, but fallback to 'system'
    this.db = new DB({
      adapter: adapterConfig.type || 'inmemory',
      tenantId: (adapterConfig as any).tenantId || 'system',
      config: adapterConfig.config || {}
    });
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<this> {
    // No-op for now; could connect DB if needed
    return this;
  }

  /**
   * Get or create an Entity instance
   * Returns Entity instance - the standalone gateway for entity operations
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'default')
   */
  async entity(name: string, tenantId = 'default'): Promise<Entity> {
    const entity = Entity.create(name, tenantId, this.db);
    await entity.initialize();
    return entity;
  }

  /**
   * Clear cached entity definitions
   */
  clearEntityCache(entityName?: string, tenantId?: string): void {
    Entity.clearCache(entityName, tenantId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entities: string[] } {
    return Entity.getCacheStats();
  }


  static clearCache(entityName?: string, tenantId?: string): void {
    Entity.clearCache(entityName, tenantId);
  }

  static getCacheStats(): { size: number; entities: string[] } {
    return Entity.getCacheStats();
  }
}