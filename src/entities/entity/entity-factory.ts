/**
 * EntityFactory - Simplified Entity Instance Management
 * 
 * Creates and manages Entity instances with caching.
 */
import { Entity } from './entity';
import { DatabaseManager } from '../../database/database-manager';
import { Context } from '../../types';

export interface EntityCacheStats {
  entityCacheSize: number;
  entities: string[];
}

export class EntityFactory {
  private databaseManager: DatabaseManager;
  private entityCache = new Map<string, Entity>();

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Create or get cached entity instance
   * @param entityName Entity name
   * @param tenantId Tenant ID (defaults to 'default')
   * @param autoInitialize Whether to automatically initialize the entity
   * @param context Context for initialization
   * @returns Entity instance
   */
  async entity(
    entityName: string, 
    tenantId: string = 'default',
    autoInitialize: boolean = true,
    context: Context = {}
  ): Promise<Entity> {
    const cacheKey = `${tenantId}:${entityName}`;
    
    if (!this.entityCache.has(cacheKey)) {
      const entity = new Entity(entityName, this.databaseManager, tenantId);
      this.entityCache.set(cacheKey, entity);
    }
    
    const entity = this.entityCache.get(cacheKey)!;
    
    // Initialize if requested and not already initialized
    if (autoInitialize && !entity.isInitialized) {
      await entity.initialize(context);
    }
    
    return entity;
  }

  /**
   * Create entity instance without caching
   * @param entityName Entity name
   * @param tenantId Tenant ID
   * @param autoInitialize Whether to automatically initialize
   * @param context Context for initialization
   * @returns New Entity instance
   */
  async createEntity(
    entityName: string,
    tenantId: string = 'default',
    autoInitialize: boolean = true,
    context: Context = {}
  ): Promise<Entity> {
    const entity = new Entity(entityName, this.databaseManager, tenantId);
    
    if (autoInitialize) {
      await entity.initialize(context);
    }
    
    return entity;
  }

  /**
   * Clear entity cache
   * @param entityName Optional entity name to clear specific entity
   * @param tenantId Optional tenant ID to clear specific tenant variant
   */
  clearCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      const cacheKey = `${tenantId}:${entityName}`;
      this.entityCache.delete(cacheKey);
    } else if (entityName) {
      // Clear all tenant variants of this entity
      const keysToDelete = Array.from(this.entityCache.keys())
        .filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => this.entityCache.delete(key));
    } else {
      this.entityCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): EntityCacheStats {
    return {
      entityCacheSize: this.entityCache.size,
      entities: Array.from(this.entityCache.keys())
    };
  }

  /**
   * Get database manager
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }
}