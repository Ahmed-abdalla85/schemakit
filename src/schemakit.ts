import { SchemaKitOptions } from './types';
import { DatabaseManager, DatabaseConfig } from './database/database-manager';
import { InstallManager } from './database/install-manager';
import { EntityManager } from './core/entity-manager';
import { ValidationManager } from './core/validation-manager';
import { PermissionManager } from './core/permission-manager';
import { WorkflowManager } from './core/workflow-manager';
import { SchemaKitError } from './errors';

export class SchemaKit {
  private readonly options: Readonly<SchemaKitOptions>;
  private readonly databaseManager: DatabaseManager;

  private installManager?: InstallManager;
  private entityManager?: EntityManager;
  private validationManager?: ValidationManager;
  private permissionManager?: PermissionManager;
  private workflowManager?: WorkflowManager;

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

      // Initialize managers with DatabaseManager
      this.entityManager = new EntityManager(this.databaseManager);
      this.validationManager = new ValidationManager();
      this.permissionManager = new PermissionManager(this.databaseManager.getAdapter());
      this.workflowManager = new WorkflowManager(this.databaseManager.getAdapter());

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
   * @param name Entity name
   * @param tenantId Tenant identifier (defaults to 'default')
   */
  entity(name: string, tenantId: string = 'default') {
    if (!this.entityManager) {
      throw new SchemaKitError('SchemaKit is not initialized. Call `initialize()` first.');
    }
    return this.entityManager.entity(name, tenantId);
  }

  /**
   * Access database manager for advanced operations
   */
  getDatabase(): DatabaseManager {
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
