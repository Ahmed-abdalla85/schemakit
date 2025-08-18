/**
 * SchemaKit - Enterprise Schema Management Library
 * 
 * Simple, focused API for entity management with enterprise architecture underneath.
 */

// Core SchemaKit class (optimized)
export { SchemaKit } from './schemakit';
// Public Entity class
export { Entity } from './entities/entity';
// Validation
export { SimpleValidationAdapter } from './validation/adapters/simple';
// EntityBuilder has been removed - use EntityManager.entity() instead

// Query components (removed legacy exports)

// Validation
export { SimpleValidationAdapter } from './validation/adapters/simple';

// Workflows (removed legacy exports)

// Core utilities


// Database module (new structure) - Main gateway for all database operations
export * from './database';
// Types (simplified) - export specific types to avoid conflicts
export type {
  EntityDefinition,
  FieldDefinition,
  EntityConfiguration,
  Context,
  SchemaKitOptions,
  FieldType,
  OperationType,
  QueryFilter,
  QueryOptions,
  QueryResult,
  BuiltQuery,
  PermissionDefinition,
  RLSCondition,
  RLSRule,
  RLSDefinition,
  RoleRestrictions,
  ViewDefinition,
  ViewOptions,
  ViewResult,
  PaginationOptions,
  SortDefinition,
  JoinDefinition,
  WorkflowDefinition,
  WorkflowAction,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './types';

// Errors
export { SchemaKitError } from './errors';

// Utilities
export * from './utils/date-helpers';
export * from './utils/id-generation';
export * from './utils/json-helpers';
export * from './utils/validation-helpers';
export { Logger } from './utils/logger';