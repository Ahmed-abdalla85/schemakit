/**
 * SchemaKit - Enterprise Schema Management Library
 *
 * Simple, focused API for entity management with enterprise architecture underneath.
 */
// Core SchemaKit class
export { SchemaKit } from './schemakit';
// Core managers
export { EntityManager } from './core/entity-manager';
export { QueryManager } from './core/query-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { WorkflowManager } from './core/workflow-manager';
export { SchemaLoader } from './core/schema-loader';
// Database adapters
export { DatabaseAdapter } from './database/adapter';
export { InMemoryAdapter } from './database/adapters/inmemory';
export { PostgresAdapter } from './database/adapters/postgres';
export { SQLiteAdapter } from './database/adapters/sqlite';
// Types
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