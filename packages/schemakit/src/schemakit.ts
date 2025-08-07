import { SchemaKitOptions } from './types/core';
import { DB, type MultiTenancyConfig } from './database/db';
import { Entity } from './entities/entity/entity';
import { SchemaKitError } from './errors';

// Extended options to support both syntaxes
type SchemaKitInitOptions = SchemaKitOptions | {
  adapter?: string;
  config?: any;
  cache?: SchemaKitOptions['cache'];
  multiTenancy?: MultiTenancyConfig;
};

export class SchemaKit {
  private readonly options: Readonly<SchemaKitInitOptions>;
  public readonly db: DB;

  constructor(options: SchemaKitInitOptions = {}) {
    this.options = options;
    
    // Support both old and new syntax
    let adapterType: string;
    let adapterConfig: any;
    
    if ('adapter' in options && typeof options.adapter === 'string') {
      // New simpler syntax: { adapter: 'postgres', config: {...} }
      adapterType = options.adapter;
      adapterConfig = (options as any).config || {};
    } else if ('adapter' in options && options.adapter && typeof options.adapter === 'object') {
      // Old syntax: { adapter: { type: 'postgres', config: {...} } }
      const adapterObj = options.adapter as SchemaKitOptions['adapter'];
      adapterType = adapterObj?.type || 'inmemory';
      adapterConfig = adapterObj?.config || {};
    } else {
      // Default
      adapterType = 'inmemory';
      adapterConfig = {};
    }
    
    // Extract multi-tenancy config
    const multiTenancy = (options as any).multiTenancy;
    
    // Allow tenantId in config, but fallback to 'system'
    this.db = new DB({
      adapter: adapterType,
      tenantId: adapterConfig.tenantId || 'system',
      config: adapterConfig,
      multiTenancy
    });
  }
  
  /**
   * Initialize the database adapter
   * Must be called before using SchemaKit with database adapters
   */
  async init(): Promise<void> {
    await this.db.init();
  }
  
  /**
   * Get or create an Entity instance
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

}