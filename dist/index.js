/**
 * SchemaKit - Enterprise Schema Management Library
 *
 * Simple, focused API for entity management with enterprise architecture underneath.
 */
// Core SchemaKit class (optimized)
export { SchemaKit } from './schemakit';
// Core managers (optimized)
export { EntityManager } from './core/entity-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { WorkflowManager } from './core/workflow-manager';
// EntityBuilder has been removed - use EntityManager.entity() instead
// Query components (new split)
export { QueryBuilder } from './core/query/query-builder';
export { PaginationManager } from './core/query/pagination-manager';
export { QueryExecutor } from './core/query/query-executor';
// Validators (new split)
export { TypeValidators } from './core/validators/type-validators';
// Workflows (new split)
export { WorkflowActions } from './core/workflows/workflow-actions';
// Core utilities
export { FileLoader } from './core/file-loader';
// Database module (new structure) - Main gateway for all database operations
export * from './database';
export { DatabaseManager, FluentQueryBuilder, createDatabase, createInMemoryDatabase, createSQLiteDatabase, createPostgresDatabase } from './database';
// Types (simplified)
export * from './types';
// Errors
export { SchemaKitError } from './errors';
// Utilities
export * from './utils/date-helpers';
export * from './utils/id-generation';
export * from './utils/json-helpers';
export * from './utils/query-helpers';
export * from './utils/validation-helpers';
//# sourceMappingURL=index.js.map