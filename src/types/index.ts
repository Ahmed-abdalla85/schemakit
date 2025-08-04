/**
 * SchemaKit Types - Organized by domain
 * 
 * Import patterns:
 * - import { Entity, Field } from '@/types'              // Common types
 * - import { ViewOptions } from '@/types/views'          // Domain-specific
 * - import { RLSCondition } from '@/types/permissions'   // Domain-specific
 */

// Core types - Most commonly used
export * from './core';

// Domain-specific modules (can be imported directly for clarity)
export * from './database';
export * from './permissions'; 
export * from './views';
export * from './workflows';
export * from './validation';

// Convenience re-exports for most common types
export type {
  // Core essentials
  EntityDefinition,
  FieldDefinition,
  EntityConfiguration,
  Context,
  SchemaKitOptions,
  FieldType,
  OperationType,
} from './core';

export type {
  // Query essentials  
  QueryFilter,
  QueryOptions,
  QueryResult,
} from './database';

export type {
  // Permission essentials
  PermissionDefinition,
  RLSCondition,
  RLSRule,
  RoleRestrictions,
} from './permissions';

export type {
  // View essentials
  ViewDefinition,
  ViewOptions,
  ViewResult,
  PaginationOptions,
  SortDefinition,
  JoinDefinition,
} from './views';

export type {
  // Validation essentials
  ValidationResult,
  ValidationError,
} from './validation';