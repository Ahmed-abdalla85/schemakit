/**
 * EntityAPIFactory - EntityAPI Instance Management
 * Responsible for creating and managing EntityAPI instances
 * 
 * This class handles:
 * - EntityAPI instance creation with proper dependency injection
 * - EntityAPI instance caching
 * - Manager lifecycle management
 */
import { EntityAPI } from './entity-api';
import { EntityManager } from './entity-manager';
import { EntityDataManager } from './entity-data-manager';
import { ValidationManager } from '../validation/validation-manager';
import { PermissionManager } from '../permission/permission-manager';
import { WorkflowManager } from '../workflow/workflow-manager';
import { DatabaseManager } from '../../database/database-manager';

/**
 * EntityAPIFactory class - EntityAPI Instance Management
 * 
 * Single Responsibility: Create and manage EntityAPI instances
 */
export class EntityAPIFactory {
  private entityManager: EntityManager;
  private entityDataManager: EntityDataManager;
  private validationManager: ValidationManager;
  private permissionManager: PermissionManager;
  private workflowManager: WorkflowManager;
  
  // EntityAPI instance cache
  private entityApiCache = new Map<string, EntityAPI>();

  /**
   * Create a new EntityAPIFactory instance
   * @param databaseManager Database manager for dependency injection
   */
  constructor(databaseManager: DatabaseManager) {
    // Initialize all required managers with proper dependency injection
    this.entityManager = new EntityManager(databaseManager);
    this.entityDataManager = new EntityDataManager(databaseManager);
    this.validationManager = new ValidationManager();
    this.permissionManager = new PermissionManager(databaseManager.getAdapter());
    this.workflowManager = new WorkflowManager(databaseManager.getAdapter());
  }

  /**
   * Create EntityAPI instance for the given entity name with optional tenant context
   * @param entityName Entity name
   * @param tenantId Tenant ID (defaults to 'default')
   * @returns EntityAPI instance
   */
  createEntityAPI(entityName: string, tenantId = 'default'): EntityAPI {
    const cacheKey = `${tenantId}:${entityName}`;
    
    if (!this.entityApiCache.has(cacheKey)) {
      // Create EntityAPI instance with proper dependency injection
      const entityApi = new EntityAPI(
        entityName,
        this.entityManager,
        this.entityDataManager,
        this.validationManager,
        this.permissionManager,
        this.workflowManager,
        tenantId
      );
      this.entityApiCache.set(cacheKey, entityApi);
    }
    
    const cachedEntity = this.entityApiCache.get(cacheKey);
    if (!cachedEntity) {
      throw new Error(`Failed to retrieve cached entity API for ${cacheKey}`);
    }
    return cachedEntity;
  }

  /**
   * Get the entity manager instance
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Get the entity data manager instance
   */
  getEntityDataManager(): EntityDataManager {
    return this.entityDataManager;
  }

  /**
   * Clears the entity API cache for a specific entity or all entities
   */
  clearEntityApiCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      const cacheKey = `${tenantId}:${entityName}`;
      this.entityApiCache.delete(cacheKey);
    } else if (entityName) {
      // Clear all tenant variants of this entity
      const keysToDelete = Array.from(this.entityApiCache.keys()).filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => this.entityApiCache.delete(key));
    } else {
      this.entityApiCache.clear();
    }
  }

  /**
   * Clear all caches (entity API and entity configuration)
   */
  clearAllCache(): void {
    this.entityApiCache.clear();
    this.entityManager.clearAllCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      entityApiCacheSize: this.entityApiCache.size,
      entityApiInstances: Array.from(this.entityApiCache.keys()),
      entityManager: this.entityManager.getCacheStats()
    };
  }
}