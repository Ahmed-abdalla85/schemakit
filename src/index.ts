/**
 * SchemaKit - Enterprise Schema Management Library
 * 
 * Simple, focused API for entity management with enterprise architecture underneath.
 */

// Core SchemaKit class (optimized)
export { SchemaKit } from './schemakit';

// Core managers (optimized)
export { EntityManager, CacheStats } from './core/entity-manager';
export { QueryManager } from './core/query-manager';
export { ValidationManager } from './core/validation-manager';
export { PermissionManager } from './core/permission-manager';
export { WorkflowManager } from './core/workflow-manager';
export { InstallManager } from './core/install-manager';
export { EntityBuilder } from './core/entity-builder';

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

// Database adapters (optimized)
export { DatabaseAdapter, DatabaseAdapterConfig } from './database/adapter';
export { BaseAdapter } from './database/base-adapter';
export { InMemoryAdapter } from './database/adapters/inmemory-simplified';
export { PostgresAdapter } from './database/adapters/postgres';
export { SQLiteAdapter } from './database/adapters/sqlite';

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