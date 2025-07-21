/**
 * Entity Module
 * Core entity management functionality
 */

// New streamlined entity classes (recommended)
export { Entity } from './entity';
export { EntityFactory, EntityCacheStats } from './entity-factory';

// Legacy classes (for backward compatibility)
export { EntityManager, CacheStats } from './entity-manager';
export { EntityAPI } from './entity-api';
export { EntityAPIFactory } from './entity-api-factory';
export { EntityDataManager } from './entity-data-manager';