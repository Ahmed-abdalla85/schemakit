/**
 * SchemaKit - Dynamic entity management system
 *
 * A comprehensive system for runtime entity creation, validation, and CRUD operations
 * with support for permissions, workflows, and dynamic query building.
 */
// Export all error types
export * from './errors';
// Export core types
export * from './types';
// Export database adapters
export * from './database/adapter';
// Export main SchemaKit class with static factory methods (EntityKit pattern)
export { SchemaKit } from './schemakit';
// Export UnifiedEntityHandler for EntityKit-style operations
export { UnifiedEntityHandler } from './unified-entity-handler';
// Export core modules for advanced usage
export { SchemaLoader } from './core/schema-loader';
export { EntityManager } from './core/entity-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { QueryManager } from './core/query-manager';
export { WorkflowManager } from './core/workflow-manager';
// Export utilities for advanced usage
export * from './utils/id-generation';
export * from './utils/date-helpers';
export * from './utils/json-helpers';
export * from './utils/validation-helpers';
export * from './utils/query-helpers';
//# sourceMappingURL=index.js.map