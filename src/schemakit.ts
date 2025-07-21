import { SchemaKitOptions } from './types';
import { DatabaseManager, DatabaseConfig } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { EntityAPIFactory } from './core/entity-api-factory';
import { SchemaKitError } from './errors';

export class SchemaKit {
  private readonly options: Readonly<SchemaKitOptions>;
  private readonly databaseManager: DatabaseManager;

  private installManager?: InstallManager;
  private entityAPIFactory?: EntityAPIFactory;

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

      // Initialize EntityAPIFactory with DatabaseManager (handles all manager creation)
      this.entityAPIFactory = new EntityAPIFactory(this.databaseManager);

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
   * Returns EntityAPI instance - the standalone gateway for entity operations
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'default')
   */
  entity(name: string, tenantId: string = 'default') {
    if (!this.entityAPIFactory) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return this.entityAPIFactory.createEntityAPI(name, tenantId);
  }

  /**
   * Access database manager for advanced operations
   */
  getDatabase(): DatabaseManager {
    return this.databaseManager;
  }

  /**
   * Access entity manager for configuration management
   */
  getEntityManager() {
    if (!this.entityAPIFactory) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return this.entityAPIFactory.getEntityManager();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.databaseManager.disconnect();
  }

  /**
   * Clear cached entity definitions
   */
  clearEntityCache(entityName?: string, tenantId?: string): void {
    this.entityManager?.clearEntityCache(entityName, tenantId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entityCacheSize: number; entities: string[] } {
    return this.entityManager?.getCacheStats() || { entityCacheSize: 0, entities: [] };
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
