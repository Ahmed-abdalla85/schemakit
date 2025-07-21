import { SchemaKitOptions } from './types';
import { DatabaseManager, DatabaseConfig } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { UnifiedEntityFactory } from './entities/unified';
import { SchemaKitError } from './errors';

export class SchemaKit {
  private readonly options: Readonly<SchemaKitOptions>;
  private readonly databaseManager: DatabaseManager;

  private installManager?: InstallManager;
  private entityFactory?: UnifiedEntityFactory;

  constructor(options: SchemaKitOptions = {}) {
    this.options = options;
    
    // Create database configuration from options
    const adapterConfig = options.adapter || {};
    const databaseConfig: DatabaseConfig = {
      type: (adapterConfig.type as any) || 'inmemory-simplified',
      ...adapterConfig.config
    };
    
    this.databaseManager = new DatabaseManager(databaseConfig);
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<this> {
    try {
      await this.databaseManager.connect();

      // Initialize UnifiedEntityFactory with DatabaseAdapter
      this.entityFactory = new UnifiedEntityFactory(this.databaseManager.getAdapter(), {
        cacheEnabled: this.options.cache?.enabled !== false,
        tenantId: 'default'
      });

      // Initialize system tables
      this.installManager = new InstallManager(this.databaseManager.getAdapter());
      await this.installManager.ensureReady();

      return this;
    } catch (error: any) {
      throw new SchemaKitError(`Failed to initialize SchemaKit: ${error.message}`);
    }
  }

  /**
   * Access entity with optional tenant context (unified API)
   * Returns UnifiedEntityHandler instance - the standalone gateway for entity operations
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'default')
   */
  async entity(name: string, tenantId = 'default') {
    if (!this.entityFactory) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return this.entityFactory.createHandler(name, tenantId);
  }

  /**
   * Access database manager for advanced operations
   */
  getDatabase(): DatabaseManager {
    return this.databaseManager;
  }

  /**
   * Access entity factory for handler creation and cache management
   */
  getEntityFactory() {
    if (!this.entityFactory) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return this.entityFactory;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.databaseManager.disconnect();
  }

  /**
   * Clear cached entity handlers
   */
  clearEntityCache(entityName?: string, tenantId?: string): void {
    this.getEntityFactory()?.clearCache(entityName, tenantId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { handlerCacheSize: number; cachedEntities: string[] } {
    return this.getEntityFactory()?.getCacheStats() || { handlerCacheSize: 0, cachedEntities: [] };
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    return this.databaseManager.getConnectionInfo();
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    return this.databaseManager.testConnection();
  }
}
