import { SchemaKitOptions } from './types/core';
import { DB, type MultiTenancyConfig } from './database/db';
import { Entity } from './entities/entity/entity';
import { SchemaKitError } from './errors';
import type {
  ValidationAdapter,
  UnknownFieldPolicy,
} from './validation/adapter';
import { SimpleValidationAdapter } from './validation/adapters/simple';

// Extended options to support both syntaxes
type SchemaKitInitOptions = SchemaKitOptions | {
  adapter?: string;
  config?: any;
  cache?: SchemaKitOptions['cache'];
  multiTenancy?: MultiTenancyConfig;
  validation?: {
    adapter?: ValidationAdapter;
    unknownFieldPolicy?: UnknownFieldPolicy;
  }
};

export class SchemaKit {
  private readonly options: Readonly<SchemaKitInitOptions>;
  public readonly db: DB;
  private validationAdapter: ValidationAdapter;

  constructor(options: SchemaKitInitOptions = {}) {
    this.options = options;
    
    let adapterType: string = 'inmemory';
    let adapterConfig: any = {};
    
    if ('adapter' in options) {
      const opt: any = options as any;
      if (typeof opt.adapter === 'string') {
        adapterType = opt.adapter;
        adapterConfig = opt.config || {};
      } else if (opt.adapter && typeof opt.adapter === 'object') {
        adapterType = opt.adapter.type || adapterType;
        adapterConfig = opt.adapter.config || {};
      }
    }
    
    // Validate adapter type early to surface configuration errors synchronously
    const supportedAdapters = new Set(['inmemory', 'sqlite', 'postgres', 'mysql']);
    if (!supportedAdapters.has(adapterType)) {
      throw new SchemaKitError(`Unsupported adapter type: ${adapterType}`);
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

    // Validation adapter
    const validation = (options as any).validation || {};
    this.validationAdapter = validation.adapter || new SimpleValidationAdapter();
  }
  
  /**
   * Get or create an Entity instance
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'public')
   */
  async entity(name: string, tenantId = 'public'): Promise<Entity> {
    const entity = Entity.create(name, tenantId, this.db);
    
    // Configure validation on the entity and initialize
    entity.setValidation(this.validationAdapter, (this.options as any)?.validation?.unknownFieldPolicy || 'strip');
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