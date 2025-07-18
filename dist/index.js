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
// Export main SchemaKit class (new modular version)
export * from './schemakit-new';
// Export core modules for advanced usage
export { SchemaLoader } from './core/schema-loader';
export { EntityManager } from './core/entity-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { QueryManager } from './core/query-builder';
export { WorkflowManager } from './core/workflow-manager';
// Keep the old SchemaKit class for backward compatibility
export { SchemaKit as SchemaKitLegacy } from './schemakit';
//# sourceMappingURL=index.js.map