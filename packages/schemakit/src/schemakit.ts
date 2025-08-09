import { SchemaKitOptions } from './types/core';
import { DB, type MultiTenancyConfig } from './database/db';
import { Entity } from './entities/entity/entity';
import { SchemaKitError } from './errors';
import type {
  ValidationAdapter,
  CompiledSchema,
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
  private schemaCache = new Map<string, CompiledSchema>();

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
    // Attach validation hooks via entity (lazy schema build) by patching methods
    await entity.initialize();

    // Build or reuse compiled schema for this entity
    const entityId = (entity as any).entityDefinition?.entity_id || `${tenantId}:${name}`;
    let compiled = this.schemaCache.get(entityId);
    if (!compiled) {
      const fields = (entity as any).fields as any[];
      compiled = this.validationAdapter.buildSchema(entityId, fields, {
        unknownFieldPolicy: (this.options as any)?.validation?.unknownFieldPolicy || 'strip'
      });
      this.schemaCache.set(entityId, compiled);
    }

    // Wrap insert/update to apply validation
    const originalInsert = entity.insert.bind(entity);
    const originalUpdate = entity.update.bind(entity);

    (entity as any).insert = async (data: Record<string, any>, context: any = {}) => {
      const res = this.validationAdapter.validate('create', compiled!, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: res.errors });
      }
      return originalInsert(res.data as any, context);
    };

    (entity as any).update = async (id: string | number, data: Record<string, any>, context: any = {}) => {
      const res = this.validationAdapter.validate('update', compiled!, data);
      if (!res.ok) {
        throw new SchemaKitError('Validation failed', { code: 'VALIDATION_FAILED', context: res.errors });
      }
      return originalUpdate(id, res.data as any, context);
    };

    return entity;
  }

  /**
   * Clear cached entity definitions
   */
  clearEntityCache(entityName?: string, tenantId?: string): void {
    Entity.clearCache(entityName, tenantId);
    // Invalidate compiled schemas if entityName provided
    if (entityName && tenantId) this.schemaCache.delete((Entity as any).cache ? `${tenantId}:${entityName}` : entityName);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entities: string[] } {
    return Entity.getCacheStats();
  }

}