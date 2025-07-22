/**
 * SchemaKit - Enterprise Schema Management Library
 * 
 * Simple, focused API for entity management with enterprise architecture underneath.
 */

// Core SchemaKit class (optimized)
export { SchemaKit } from './schemakit';
// Legacy managers (organized by entities) - for backward compatibility
export { Entity } from './entities/entity';
export { ValidationManager } from './entities/validation';
export { PermissionManager } from './entities/permission';
export { WorkflowManager } from './entities/workflow';
// EntityBuilder has been removed - use EntityManager.entity() instead

// Query components (organized)
export { QueryBuilder } from './entities/query';
export { PaginationManager } from './entities/query';

// Validators (organized)
export { TypeValidators } from './entities/validation';

// Workflows (organized)
export { WorkflowActions } from './entities/workflow';

// Core utilities
export { SchemaLoader } from './database/schema-loader';

// Database module (new structure) - Main gateway for all database operations
export * from './database';
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
export { Logger } from './utils/logger';