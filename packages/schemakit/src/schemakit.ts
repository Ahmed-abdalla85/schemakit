import { DB, type MultiTenancyConfig } from './database/db';
import { DEFAULT_TENANT_ID } from './database/constants';
import { Entity } from './entities/entity/entity';
import { InstallManager } from './database/install-manager';
import { SchemaKitError } from './errors';
import type {
  ValidationAdapter,
  UnknownFieldPolicy,
} from './validation/adapter';
import { SimpleValidationAdapter } from './validation/adapters/simple';

// Minimal, string-only adapter options
type SchemaKitInitOptions = {
  adapter?: string;
  config?: any;
  multiTenancy?: MultiTenancyConfig;
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
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
    
    let adapterType: string = 'sqlite';
    let adapterConfig: any = {};
    if (typeof (options as any).adapter === 'string') {
      adapterType = (options as any).adapter;
      adapterConfig = (options as any).config || {};
    }
    
    // Validate adapter type early to surface configuration errors synchronously
    const supportedAdapters = new Set(['sqlite', 'postgres', 'mysql']);
    if (!supportedAdapters.has(adapterType)) {
      throw new SchemaKitError(`Unsupported adapter type: ${adapterType}`);
    }

    // Extract multi-tenancy config
    const multiTenancy = (options as any).multiTenancy;
    
    // Allow tenantId in config, but fallback to 'system'
    this.db = new DB({
      adapter: adapterType,
      tenantId: adapterConfig.tenantId || DEFAULT_TENANT_ID,
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
  async entity(name: string, tenantId = DEFAULT_TENANT_ID): Promise<Entity> {
    const entity = Entity.create(name, tenantId, this.db);
    
    // Configure validation on the entity and initialize
    entity.setValidation(this.validationAdapter, (this.options as any)?.validation?.unknownFieldPolicy || 'strip');
    await entity.initialize();
    return entity;
  }


  async install(schema:string){
    let adapter=await this.db.getAdapter();
    const installManager = new InstallManager(adapter);
    await installManager.install(schema);
    console.log('SchemaKit installed successfully');
  }

}