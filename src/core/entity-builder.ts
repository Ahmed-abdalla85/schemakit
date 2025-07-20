import type { SchemaLoader } from './schema-loader';
import type { EntityManager } from './entity-manager';
import type { ValidationManager } from './validation-manager';
import type { PermissionManager } from './permission-manager';
import type { WorkflowManager } from './workflow-manager';

import { EntityAPI } from './entity-api';

export class EntityBuilder {
  private cache = new Map<string, EntityAPI>();

  constructor(
    private readonly schemaLoader: SchemaLoader,
    private readonly entityManager: EntityManager,
    private readonly validationManager: ValidationManager,
    private readonly permissionManager: PermissionManager,
    private readonly workflowManager: WorkflowManager
  ) {}

  /**
   * Returns a fluent EntityAPI instance for the given entity name.
   */
  entity(entityName: string): EntityAPI {
    return this.entityForTenant(entityName, 'default');
  }

  /**
   * Returns a fluent EntityAPI instance for the given entity name with tenant context.
   */
  entityForTenant(entityName: string, tenantId: string = 'default'): EntityAPI {
    const cacheKey = `${tenantId}:${entityName}`;
    
    if (!this.cache.has(cacheKey)) {
      const entityApi = new EntityAPI(
        entityName,
        this.schemaLoader,
        this.entityManager,
        this.validationManager,
        this.permissionManager,
        this.workflowManager,
        tenantId
      );
      this.cache.set(cacheKey, entityApi);
    }
    return this.cache.get(cacheKey)!;
  }

  /**
   * Clears the cache for a specific entity or all entities.
   */
  clearEntityCache(entityName?: string, tenantId?: string): void {
    if (entityName && tenantId) {
      const cacheKey = `${tenantId}:${entityName}`;
      this.cache.delete(cacheKey);
    } else if (entityName) {
      // Clear all tenant variants of this entity
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.endsWith(`:${entityName}`));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Returns basic cache statistics.
   */
  getCacheStats(): { entityCacheSize: number; entities: string[] } {
    return {
      entityCacheSize: this.cache.size,
      entities: Array.from(this.cache.keys()),
    };
  }
}
