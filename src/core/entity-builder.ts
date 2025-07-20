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
    if (!this.cache.has(entityName)) {
      const entityApi = new EntityAPI(
        entityName,
        this.schemaLoader,
        this.entityManager,
        this.validationManager,
        this.permissionManager,
        this.workflowManager
      );
      this.cache.set(entityName, entityApi);
    }
    return this.cache.get(entityName)!;
  }

  /**
   * Clears the cache for a specific entity or all entities.
   */
  clearEntityCache(entityName?: string): void {
    if (entityName) {
      this.cache.delete(entityName);
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
