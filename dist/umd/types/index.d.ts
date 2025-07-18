/**
 * SchemaKit - Dynamic entity management system
 *
 * A comprehensive system for runtime entity creation, validation, and CRUD operations
 * with support for permissions, workflows, and dynamic query building.
 */
export * from './errors';
export * from './types';
export * from './database/adapter';
export * from './schemakit-new';
export { SchemaLoader } from './core/schema-loader';
export { EntityManager } from './core/entity-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { QueryManager, QueryBuilder } from './core/query-builder';
export { WorkflowManager } from './core/workflow-manager';
export { SchemaKit as SchemaKitLegacy } from './schemakit';
