import { SchemaKitOptions } from './types';
import { DatabaseManager, DatabaseConfig } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { Entity } from './entities/entity/entity';
import { SchemaKitError } from './errors';

export class SchemaKit {
  private readonly options: Readonly<SchemaKitOptions>;
  private readonly databaseManager: DatabaseManager;

  private installManager?: InstallManager;

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
   * Returns Entity instance - the standalone gateway for entity operations
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'default')
   */
  entity(name: string, tenantId = 'default'): Entity {
    if (!this.installManager) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return Entity.create(name, tenantId, this.databaseManager);
  }

  /**
   * Access database manager for advanced operations
   */
  getDatabase(): DatabaseManager {
    return this.databaseManager;
  }

  /**
   * Access database manager for configuration management
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
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
    Entity.clearCache(entityName, tenantId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entities: string[] } {
    return Entity.getCacheStats();
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
